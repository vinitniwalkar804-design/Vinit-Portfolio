/**
 * File-storage abstraction.
 *
 * The portfolio runs on Vercel serverless functions, where the deployment
 * bundle is READ-ONLY and any write to it is discarded when the instance is
 * recycled. A resume upload therefore cannot be implemented by writing into
 * `frontend/public/`: the write either fails with EROFS, or lands in an ephemeral
 * scratch directory that the CDN never serves and the next cold start forgets.
 *
 * Providers:
 *   vercel-blob  - durable object storage (production). Requires
 *                  BLOB_READ_WRITE_TOKEN. Selected automatically.
 *   local        - writes into the git-served frontend/public tree. Local
 *                  development only, and never used on Vercel.
 *
 * All file I/O from the CMS goes through this module so the provider can be
 * swapped without touching controllers or routes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_VERCEL = process.env.VERCEL === '1';
const BLOB_TOKEN = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
const BLOB_PREFIX = sanitisePrefix(process.env.BLOB_RESUME_PREFIX || 'resumes');

let blob = null;
if (BLOB_TOKEN) {
  try {
    blob = require('@vercel/blob');
  } catch (err) {
    console.warn(
      `[storage] BLOB_READ_WRITE_TOKEN is set but @vercel/blob could not be loaded (${err.message}). ` +
        'Re-run "npm install" so production uploads are durable.'
    );
  }
}

const PROVIDER = blob ? 'vercel-blob' : 'local';

const PROXY_AUTH_DIRS = { certificates: 'certificates', assets: 'assets' };
// The local provider mirrors the served public tree. That tree is the frontend's,
// a sibling of backend/, so it is two levels up from here rather than one.
const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'frontend', 'public');

/**
 * The public resume contract. index.html hard-codes this href, so it must never
 * change: uploads are stored under opaque, versioned object names and the app
 * serves whichever revision is active. That keeps old links, bookmarks and any
 * shared resume URL working forever.
 */
const RESUME_FILENAME = 'Vinit-Niwalkar-Resume.pdf';
const RESUME_URL = `/assets/${RESUME_FILENAME}`;

const MIME = 'application/pdf';
const BLOB_FETCH_TIMEOUT_MS = Number(process.env.BLOB_FETCH_TIMEOUT_MS) || 10000;
const ARCHIVE_DIR = '_archive';

function sanitisePrefix(input) {
  const s = String(input || '')
    .trim()
    .replace(/[^A-Za-z0-9._/-]/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '');
  if (!s || s.includes('..')) return 'resumes';
  return s;
}

function publicDirFor(category) {
  const key = PROXY_AUTH_DIRS[category] || 'uploads';
  return path.join(PUBLIC_ROOT, key);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(input, max = 40) {
  const slug = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, max);
  return slug || 'file';
}

function safeExtFor(mimeType, originalName) {
  const fromMime = mimeType === 'application/pdf' || mimeType === 'application/x-pdf'
    ? '.pdf'
    : '';
  if (fromMime) return fromMime;
  const ext = path.extname(String(originalName || '')).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return ext === '.pdf' ? '.pdf' : '.bin';
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/**
 * The CMS accepts PDFs only. multer's fileFilter trusts the browser-supplied
 * mime type / name, so sniff the real magic bytes before anything is stored or
 * published.
 */
function assertPdf(buffer, mimeType, originalName) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file data received.');
  if (safeExtFor(mimeType, originalName) !== '.pdf') throw badRequest('Only PDF files are allowed.');
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw badRequest('Only PDF files are allowed.');
  }
}

/**
 * Fail loudly instead of pretending an upload worked. On Vercel a missing
 * token means there is no durable store, and writing to the function filesystem
 * would produce exactly the "200 OK but the resume never changed" bug.
 */
function assertWritable() {
  if (PROVIDER === 'vercel-blob') return;
  if (IS_VERCEL) {
    const err = new Error(
      'File storage is not configured on this deployment. Set BLOB_READ_WRITE_TOKEN to a Vercel Blob store token.'
    );
    err.statusCode = 503;
    err.expose = true;
    throw err;
  }
}

// ------------------------------------------------------------------ blob ----

function blobPathname() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${BLOB_PREFIX}/${stamp}-${crypto.randomBytes(6).toString('hex')}.pdf`;
}

/**
 * Every upload gets its own object name, so a replace never overwrites the
 * previous revision - the old resume stays downloadable at its own URL and is
 * recorded in the CMS archive.
 */
async function putBlob(buffer) {
  const pathname = blobPathname();
  const result = await blob.put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: MIME,
    token: BLOB_TOKEN
  });
  if (!result || !result.url) throw new Error('Blob store did not return a URL.');
  return { url: result.url, pathname: result.pathname || pathname };
}

/**
 * Streams the active revision back through the app. `null` means "not there",
 * so the caller can fall back to the copy bundled with the deployment.
 */
async function fetchRemote(storageUrl) {
  if (!isRemoteUrl(storageUrl)) return null;
  let upstream;
  try {
    upstream = await fetch(storageUrl, {
      redirect: 'follow',
      signal: timeoutSignal(BLOB_FETCH_TIMEOUT_MS)
    });
  } catch (err) {
    console.warn(`[storage] could not reach blob storage for the active resume (${err.message})`);
    return null;
  }
  if (upstream.status === 404 || upstream.status === 410) return null;
  if (!upstream.ok) {
    console.warn(`[storage] blob storage answered ${upstream.status} for the active resume`);
    return null;
  }
  return upstream;
}

async function headRemote(storageUrl) {
  if (!isRemoteUrl(storageUrl)) return null;
  try {
    return await blob.head(storageUrl, { token: BLOB_TOKEN });
  } catch (err) {
    console.warn(`[storage] blob head failed for ${storageUrl} (${err.message})`);
    return null;
  }
}

/**
 * Best-effort delete of a blob object. Callers use this to clean up a replaced
 * file *after* the database has already been updated, so a failure here must
 * never surface as a failed request - it would leave the admin panel showing an
 * error even though the upload worked.
 *
 * @returns {Promise<boolean>} true when the object is gone
 */
async function deleteRemote(storageUrl) {
  if (!isRemoteUrl(storageUrl)) return false;
  if (!blob) {
    console.warn(
      `[storage] cannot delete ${storageUrl}: no BLOB_READ_WRITE_TOKEN on this runtime, so the object is left in place.`
    );
    return false;
  }
  // Pass the pathname rather than the full URL so the delete still resolves if
  // the store is reached through a custom domain.
  let target = storageUrl;
  try {
    target = new URL(storageUrl).pathname.replace(/^\/+/, '');
  } catch (_) {
    // keep the original value
  }
  try {
    await blob.del(target, { token: BLOB_TOKEN });
    return true;
  } catch (err) {
    const code = err && err.notFound ? 'not-found' : err && err.code;
    console.warn(`[storage] blob delete failed for ${storageUrl} (${code || err.message})`);
    return false;
  }
}

function isRemoteUrl(url) {
  return /^https:\/\/[A-Za-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(String(url || ''));
}

function timeoutSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch (_) {
    return undefined; // Node < 17.3
  }
}

// ---------------------------------------------------------------- resume ----

/**
 * Stores a new active resume revision and returns everything the caller needs
 * to update the database. The caller MUST only write to MongoDB once this
 * resolves - a rejected promise means nothing was stored.
 *
 *   url             stable public path (never changes)
 *   storageUrl      provider URL, only meaningful for vercel-blob
 *   storageProvider which provider actually took the bytes
 */
async function replaceResume({ buffer, originalName, mimeType }) {
  assertPdf(buffer, mimeType, originalName);
  assertWritable();

  if (PROVIDER === 'vercel-blob') {
    const { url, pathname } = await putBlob(buffer);
    return {
      url: RESUME_URL,
      name: RESUME_FILENAME,
      mimeType: MIME,
      size: buffer.length,
      storageUrl: url,
      storageProvider: PROVIDER,
      blobPathname: pathname,
      archivedPrevious: false
    };
  }

  // Local development: write into the served frontend/public tree and keep a copy of
  // the outgoing revision so nothing is lost.
  const assetsDir = path.join(PUBLIC_ROOT, 'assets');
  ensureDir(assetsDir);
  const finalPath = path.join(assetsDir, RESUME_FILENAME);
  const tmpPath = path.join(assetsDir, `.${RESUME_FILENAME}.${process.pid}.${Date.now()}.tmp`);

  let archivedPrevious = false;
  try {
    const stat = fs.statSync(finalPath);
    if (stat && stat.isFile() && stat.size > 0) {
      const archiveDir = path.join(assetsDir, ARCHIVE_DIR);
      ensureDir(archiveDir);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.promises.copyFile(finalPath, path.join(archiveDir, `${RESUME_FILENAME}.${stamp}`));
      archivedPrevious = true;
    }
  } catch (_) {
    // no existing resume - fine
  }

  await fs.promises.writeFile(tmpPath, buffer, { flag: 'w' });
  // rename() over an open file is unreliable on Windows, so copy-then-unlink.
  await fs.promises.copyFile(tmpPath, finalPath);
  await fs.promises.unlink(tmpPath);

  return {
    url: RESUME_URL,
    name: RESUME_FILENAME,
    mimeType: MIME,
    size: buffer.length,
    storageUrl: '',
    storageProvider: PROVIDER,
    blobPathname: '',
    archivedPrevious
  };
}

/**
 * Size / modification date of the resume copy shipped inside the deployment.
 * Used before the CMS has ever stored a revision so the admin panel can report
 * a real size and date instead of "unknown" / "-".
 */
function statBundledResume() {
  try {
    const file = path.join(PUBLIC_ROOT, 'assets', RESUME_FILENAME);
    const stat = fs.statSync(file);
    if (!stat.isFile() || !stat.size) return null;
    return { size: stat.size, mtime: stat.mtime, present: true };
  } catch (_) {
    return null;
  }
}

/**
 * Is the resume a record points at actually retrievable? Blob revisions are
 * checked with a HEAD so the admin panel never reports a live-looking record
 * whose file has been deleted from storage.
 */
async function isAvailable(record) {
  if (!record) return false;
  if (record.storageProvider === 'vercel-blob' && record.storageUrl) {
    const head = await headRemote(record.storageUrl);
    return !!head;
  }
  if (isRemoteUrl(record.url)) return !!(await headRemote(record.url));
  return !!(await existsByUrl(record.url || RESUME_URL));
}

/**
 * Latest record as stored in MongoDB. Shared by the public download route and
 * the admin panel so both always agree on what "active" means.
 */
async function latestRecord() {
  try {
    const Resume = require('../models/Resume');
    return await Resume.findOne().sort({ createdAt: -1 }).lean();
  } catch (err) {
    console.warn(`[storage] could not read the active resume record (${err.message})`);
    return null;
  }
}

/**
 * Blob prefix for a certificate file. Mirrors the local public layout
 * (frontend/public/certificates/x.pdf -> certificates/x.pdf) so a row written under one
 * provider stays recognisable under the other.
 */
function blobCategoryPrefix(category) {
  const key = PROXY_AUTH_DIRS[category] ? category : 'uploads';
  const safe = sanitisePrefix(key);
  return safe === 'resumes' ? 'certificates' : safe;
}

/**
 * Saves a PDF under frontend/public/{category} (local) or {category}/ in blob storage.
 * Generates a safe, unique, random-suffixed filename derived from the title -
 * never uses the raw uploaded name, so path traversal / collision is not
 * possible.
 *
 * Certificate URLs have always changed on every upload (the random suffix), so
 * unlike the resume there is no stable-path contract to honour here: on
 * vercel-blob the CDN url is stored on the document, which also means the public
 * page downloads straight from the CDN without invoking a function.
 */
async function savePdf({ buffer, originalName, mimeType, title = 'file', category }) {
  assertPdf(buffer, mimeType, originalName);
  assertWritable();

  const outName = `${slugify(title)}-${crypto.randomBytes(6).toString('hex')}.pdf`;

  if (PROVIDER === 'vercel-blob') {
    const prefix = blobCategoryPrefix(category);
    const pathname = `${prefix}/${outName}`;
    const result = await blob.put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: MIME,
      token: BLOB_TOKEN
    });
    if (!result || !result.url) throw new Error('Blob store did not return a URL.');
    return { url: result.url, name: outName, size: buffer.length, pathname: result.pathname || pathname };
  }

  const dir = publicDirFor(category);
  ensureDir(dir);
  const abs = path.join(dir, outName);

  // Enforce that the resolved path stays inside the target directory.
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(abs);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) throw badRequest('Invalid file path.');

  await fs.promises.writeFile(resolvedFile, buffer, { flag: 'wx' });
  return {
    url: `/${category}/${outName}`,
    name: outName,
    size: buffer.length,
    pathname: `/${category}/${outName}`
  };
}

/**
 * Resolves a root-relative public URL to a file inside the public root. Returns
 * null for anything that escapes the root or is not root-relative.
 */
function localPathFor(url) {
  if (!url || !String(url).startsWith('/')) return null;
  try {
    const abs = path.resolve(path.join(PUBLIC_ROOT, ...String(url).split('/').filter(Boolean)));
    return abs.startsWith(path.resolve(PUBLIC_ROOT) + path.sep) ? abs : null;
  } catch (_) {
    return null;
  }
}

/**
 * Removes a stored file given its public URL, for either provider - a row can
 * legitimately hold a blob url while the runtime is on the local provider (or
 * the other way round) after a provider change.
 *
 * Never throws: this runs as post-save cleanup, so the caller must not be made
 * to report a failure for a file that is already no longer referenced.
 */
async function removeByUrl(url) {
  if (!url) return false;
  if (isRemoteUrl(url)) return deleteRemote(url);

  const abs = localPathFor(url);
  if (!abs) return false;
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (err) {
    if (err && err.code !== 'ENOENT') console.warn(`[storage] could not remove ${url} (${err.code || err.message})`);
    return false;
  }
}

/**
 * Does the file behind this public URL still exist? Blob urls are checked with a
 * HEAD so a document never advertises a file that has been deleted.
 */
async function existsByUrl(url) {
  if (!url) return false;
  if (isRemoteUrl(url)) return !!(await headRemote(url));
  const abs = localPathFor(url);
  if (!abs) return false;
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

module.exports = {
  PROVIDER,
  IS_VERCEL,
  RESUME_URL,
  RESUME_FILENAME,
  MIME,
  replaceResume,
  statBundledResume,
  isAvailable,
  fetchRemote,
  latestRecord,
  // certificate-file helpers, provider-aware
  savePdf,
  removeByUrl,
  existsByUrl
};
