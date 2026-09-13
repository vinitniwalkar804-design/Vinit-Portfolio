/**
 * File-storage abstraction.
 *
 * The portfolio may eventually run on serverless infrastructure (Vercel
 * Blob / S3 / Cloudinary) where a local filesystem is not persistent. All file
 * I/O from the admin CMS must go through this module so the provider can be
 * swapped without touching controllers or routes.
 *
 * Current provider: "local" — writes into the git-served `public/` tree.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROXY_AUTH_DIRS = { certificates: 'certificates', assets: 'assets' };
const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public');

const RESUME_FILENAME = 'Vinit-Niwalkar-Resume.pdf';
const RESUME_URL = `/assets/${RESUME_FILENAME}`;

const PROVIDER = 'local';

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

/**
 * Saves a PDF buffer under public/{category}. Generates a safe, unique,
 * random-suffixed filename derived from the title - never uses the raw
 * uploaded name, so path traversal / collision is not possible.
 */
async function savePdf({ buffer, originalName, mimeType, title = 'file', category }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const err = new Error('No file data received.');
    err.statusCode = 400;
    throw err;
  }
  const ext = safeExtFor(mimeType, originalName);
  if (ext !== '.pdf') {
    const err = new Error('Only PDF files are allowed.');
    err.statusCode = 400;
    throw err;
  }

  const dir = publicDirFor(category);
  ensureDir(dir);
  const outName = `${slugify(title)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const abs = path.join(dir, outName);

  // Enforce that the resolved path stays inside the target directory.
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(abs);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    const err = new Error('Invalid file path.');
    err.statusCode = 400;
    throw err;
  }

  await fs.promises.writeFile(resolvedFile, buffer, { flag: 'wx' });
  const url = `/${category}/${outName}`;
  return { url, name: outName, size: buffer.length };
}

/**
 * Replaces the active resume atomically on the local provider. The public
 * download widget hard-codes `/assets/Vinit-Niwalkar-Resume.pdf`, so the new
 * file must land at that exact path. The previous file is archived under
 * public/assets/_archive/ so nothing is silently lost.
 */
async function replaceResume({ buffer, originalName, mimeType }) {
  const ext = safeExtFor(mimeType, originalName);
  if (ext !== '.pdf') {
    const err = new Error('Only PDF files are allowed.');
    err.statusCode = 400;
    throw err;
  }
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const err = new Error('No file data received.');
    err.statusCode = 400;
    throw err;
  }

  const assetsDir = path.join(PUBLIC_ROOT, 'assets');
  ensureDir(assetsDir);

  const finalPath = path.join(assetsDir, RESUME_FILENAME);
  const tmpPath = path.join(assetsDir, `.${RESUME_FILENAME}.${process.pid}.${Date.now()}.tmp`);

  // Archive any existing resume before replacing it.
  try {
    const stat = fs.statSync(finalPath);
    if (stat && stat.isFile() && stat.size > 0) {
      const archiveDir = path.join(assetsDir, '_archive');
      ensureDir(archiveDir);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.promises.copyFile(finalPath, path.join(archiveDir, `${RESUME_FILENAME}.${stamp}`));
    }
  } catch (_) {
    // no existing resume - fine
  }

  await fs.promises.writeFile(tmpPath, buffer, { flag: 'w' });
  if (process.platform === 'win32') {
    await fs.promises.copyFile(tmpPath, finalPath);
    await fs.promises.unlink(tmpPath);
  } else {
    await fs.promises.rename(tmpPath, finalPath);
  }

  return { url: RESUME_URL, name: RESUME_FILENAME, size: buffer.length };
}

/**
 * Removes a locally stored file by public URL (glob-absolutely safe: only
 * removes files that live under the public root).
 */
async function removeByUrl(url) {
  if (!url || !String(url).startsWith('/')) return;
  let abs;
  try {
    abs = path.resolve(path.join(PUBLIC_ROOT, ...String(url).split('/').filter(Boolean)));
  } catch (_) {
    return;
  }
  if (!abs.startsWith(path.resolve(PUBLIC_ROOT) + path.sep)) return;
  try {
    await fs.promises.unlink(abs);
  } catch (_) {
    // already gone
  }
}

function existsByUrl(url) {
  if (!url || !String(url).startsWith('/')) return false;
  try {
    const abs = path.resolve(path.join(PUBLIC_ROOT, ...String(url).split('/').filter(Boolean)));
    return abs.startsWith(path.resolve(PUBLIC_ROOT) + path.sep) && fs.existsSync(abs);
  } catch (_) {
    return false;
  }
}

module.exports = {
  PROVIDER,
  RESUME_URL,
  savePdf,
  replaceResume,
  removeByUrl,
  existsByUrl
};