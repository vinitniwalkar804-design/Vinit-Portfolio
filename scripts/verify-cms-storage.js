/**
 * CMS storage verification harness (resume + certificates).
 *
 *   node scripts/verify-cms-storage.js            # run every scenario
 *   node scripts/verify-cms-storage.js C          # run one scenario
 *
 * Each "function instance" is a real child process running server/server.js, so
 * every restart is a genuine cold start (fresh module graph, fresh /tmp, only
 * MongoDB + the blob store carry over). That is exactly the Vercel model.
 *
 *   A  Vercel runtime, read-only bundle   -> reproduces the production bug
 *   B  Vercel runtime, writable /tmp only -> "succeeds", then silently lost
 *   C  Vercel runtime + Vercel Blob      -> durable, survives a cold start
 *   D  local development                 -> npm start, filesystem provider
 *   E  certificate PDFs on Vercel Blob   -> the same bug in its second caller
 *
 * Scenario C and E drive the real @vercel/blob SDK unmodified; only global fetch
 * is intercepted so it talks to a local stand-in for the Blob API whose store
 * lives outside the instance sandbox, the way real Blob storage does.
 */
'use strict';

require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const SELF = __filename;
const RESUME_PATH = '/assets/Vinit-Niwalkar-Resume.pdf';

// =============================================================================
// child mode: boot one "function instance"
// =============================================================================

function erofs() {
  const e = new Error("EROFS: read-only file system, open '/var/task/public/assets/Vinit-Niwalkar-Resume.pdf'");
  e.code = 'EROFS';
  e.errno = -30;
  e.syscall = 'open';
  return e;
}

/** Vercel's deployment bundle (/var/task) is read-only. */
function makeBundleReadOnly() {
  for (const op of ['writeFile', 'appendFile', 'copyFile', 'rename', 'unlink', 'mkdir', 'rmdir', 'rm']) {
    if (typeof fs.promises[op] === 'function') fs.promises[op] = () => Promise.reject(erofs());
  }
  for (const op of ['writeFileSync', 'appendFileSync', 'copyFileSync', 'renameSync', 'unlinkSync', 'mkdirSync', 'rmSync']) {
    if (typeof fs[op] === 'function') fs[op] = () => { throw erofs(); };
  }
}

/**
 * Vercel only guarantees a writable /tmp. Writes therefore "succeed" but land
 * outside the served bundle, so the uploaded file is unreachable and is gone
 * with the instance. Reads are untouched (they see the immutable bundle).
 */
function makeWritesEphemeral(toDir) {
  const remap = (p) => {
    const s = String(p);
    if (!s.startsWith(ROOT + path.sep)) return p;
    return path.join(toDir, path.relative(ROOT, s));
  };
  // copyFile/rename take TWO paths - every argument has to be remapped or the
  // write would still land in the real (served) folder.
  const remapArgs = (args) => args.map((a) => (typeof a === 'string' ? remap(a) : a));
  for (const op of ['writeFile', 'appendFile', 'copyFile', 'rename', 'mkdir', 'unlink']) {
    const orig = fs.promises[op];
    if (typeof orig !== 'function') continue;
    fs.promises[op] = function patched(...args) {
      return orig.apply(this, remapArgs(args));
    };
  }
  for (const op of ['writeFileSync', 'copyFileSync', 'renameSync', 'mkdirSync', 'unlinkSync']) {
    const orig = fs[op];
    if (typeof orig !== 'function') continue;
    fs[op] = function patched(...args) {
      return orig.apply(this, remapArgs(args));
    };
  }
}

/** Local stand-in for the Vercel Blob API + CDN, backed by a durable directory. */
function installFakeBlob(storeDir, cdnHost) {
  fs.mkdirSync(storeDir, { recursive: true });
  const realFetch = globalThis.fetch;
  const safe = (p) => path.join(storeDir, ...String(p).split('/').filter((s) => s && s !== '..'));
  const read = (rel) => {
    const f = safe(rel);
    return fs.existsSync(f) ? fs.readFileSync(f) : null;
  };
  const rel = (target) => {
    let s = String(target);
    const scheme = s.indexOf('://');
    if (scheme >= 0) {
      // a full blob URL: drop the origin, keep the pathname
      s = s.slice(scheme + 3);
      const slash = s.indexOf('/');
      s = slash >= 0 ? s.slice(slash + 1) : '';
    }
    // put/head get a URL or a pathname, del() posts bare pathnames - both must
    // resolve to the same object, so only strip a leading slash here.
    return s.split('?')[0].replace(/^\/+/, '');
  };

  globalThis.fetch = async function fakeFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input && input.url);
    const method = String((init && init.method) || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    const headers = (init && init.headers) || (typeof input === 'object' && input.headers) || {};
    const header = (n) => (typeof headers.get === 'function' ? headers.get(n) : headers[n]);

    if (url.startsWith('https://vercel.com/api/blob')) {
      const u = new URL(url);
      const apiError = (code, message, status) =>
        new Response(JSON.stringify({ error: { code, message } }), {
          status, headers: { 'content-type': 'application/json' } });

      // del() POSTs { urls: [...] } to /delete, so the stand-in has to honour it
      // or a blob delete would silently no-op and look like a storage leak.
      if (u.pathname.endsWith('/delete')) {
        let urls = [];
        try {
          urls = JSON.parse(init.body || '{}').urls || [];
        } catch (_) {
          return apiError('bad_request', 'invalid request body', 400);
        }
        if (!Array.isArray(urls) || !urls.length) return apiError('bad_request', 'no urls supplied', 400);
        const results = urls.map((target) => {
          const rpath = rel(target);
          const file = safe(rpath);
          const existed = fs.existsSync(file);
          if (existed) fs.rmSync(file);
          return { url: `https://${cdnHost}/${rpath}`, deleted: existed };
        });
        return new Response(JSON.stringify({ results }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      const pathname = u.searchParams.get('pathname');
      const byUrl = u.searchParams.get('url');
      if (!pathname && !byUrl) {
        return apiError('bad_request', 'missing pathname', 400);
      }
      if ((method === 'PUT' || method === 'POST') && pathname) {
        const buf = Buffer.from(init.body);
        const f = safe(pathname);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, buf);
        return new Response(
          JSON.stringify({
            url: `https://${cdnHost}/${pathname}`,
            downloadUrl: `https://${cdnHost}/${pathname}?download=1`,
            pathname,
            contentType: header('content-type') || 'application/octet-stream',
            contentDisposition: null,
            etag: `"${buf.length.toString(16)}"`,
            uploadedAt: new Date().toISOString(),
            size: buf.length
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      const target = byUrl || pathname;
      const buf = read(rel(target));
      if (!buf) {
        return apiError('blob_not_found', 'The specified blob does not exist.', 404);
      }
      if (method === 'DELETE') return new Response(null, { status: 200 });

      // head() and get() both issue GET against the blob API and expect JSON
      // metadata (head() cannot use a real HEAD because it has no body).
      const rpath = rel(target);
      return new Response(
        JSON.stringify({
          url: `https://${cdnHost}/${rpath}`,
          downloadUrl: `https://${cdnHost}/${rpath}?download=1`,
          pathname: rpath,
          size: buf.length,
          contentType: 'application/pdf',
          contentDisposition: '',
          cacheControl: 'public, max-age=31536000',
          uploadedAt: new Date().toISOString(),
          etag: `"${buf.length.toString(16)}"`
        }),
        { status: 200, headers: { 'content-type': 'application/json', etag: `"${buf.length.toString(16)}"` } }
      );
    }

    if (url.includes(cdnHost)) {
      const buf = read(rel(new URL(url).pathname));
      if (!buf) return new Response('not found', { status: 404 });
      const h = { 'content-type': 'application/pdf', 'content-length': String(buf.length) };
      return new Response(method === 'HEAD' ? null : buf, { status: 200, headers: h });
    }

    return realFetch(input, init);
  };

  // @vercel/blob talks to its API through undici's fetch, not the global one,
  // so both have to be intercepted for the stand-in to be reachable.
  try {
    const undici = require(path.join(ROOT, 'node_modules', 'undici'));
    if (undici && typeof undici.fetch === 'function') undici.fetch = globalThis.fetch;
  } catch (err) {
    console.log(`  (could not patch undici.fetch: ${err.message})`);
  }
}

async function childMain() {
  // argv: [node, SELF, 'instance', scenario, port, sandbox, cdnHost]
  const scenario = process.argv[3];
  const port = Number(process.argv[4]);
  const sandbox = process.argv[5];
  const cdnHost = process.argv[6];
  const storeDir = path.join(sandbox, 'blob-store');
  const tmpDir = path.join(sandbox, `tmp-${scenario}-${process.pid}`);

  if (scenario === 'D') {
    // Local development: `npm start`, no Vercel, no blob token.
    delete process.env.VERCEL;
    delete process.env.NODE_ENV;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  } else {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    process.env.PORT = String(port);
    if (scenario === 'C') {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_storetest_abcdef123456';
    } else {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  }

  // /tmp is always writable on Vercel - create it before simulating the
  // read-only deployment bundle.
  fs.mkdirSync(tmpDir, { recursive: true });

  if (scenario === 'A') makeBundleReadOnly();
  else if (scenario === 'B') makeWritesEphemeral(tmpDir);
  else if (scenario === 'C') installFakeBlob(storeDir, cdnHost);

  const app = require(path.join(ROOT, 'server', 'server.js'));
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const storage = require(path.join(ROOT, 'server', 'config', 'storage.js'));
  process.stdout.write(`READY ${JSON.stringify({ provider: storage.PROVIDER, pid: process.pid })}\n`);

  const bye = () => { try { require('mongoose').disconnect(); } catch (_) {} process.exit(0); };
  process.on('SIGTERM', bye);
  process.on('SIGINT', bye);
}

const ROOT = path.join(__dirname, '..');

// =============================================================================
// driver
// =============================================================================

function request(port, method, urlPath, { headers = {}, cookie, body, raw } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (raw) h['content-type'] = raw.contentType;
    else if (body) h['content-type'] = 'application/json';
    const payload = raw ? raw.body : body ? JSON.stringify(body) : null;
    if (payload) h['content-length'] = Buffer.byteLength(payload);
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const jsonOf = (r) => { try { return JSON.parse(r.buffer.toString('utf8')); } catch (_) { return {}; } };

function makePdf(label) {
  const stream = `BT /F1 18 Tf 72 720 Td (${label}) Tj ET\n`;
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${stream.length}>>stream\n${stream}endstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const pdfLabel = (r) => {
  const m = /Td\s*\(([^)]*)\)\s*Tj/.exec(r.buffer.toString('latin1'));
  return m ? m[1] : null;
};

function multipart(buffer, filename) {
  const boundary = '----resumeHarnessBoundary7f1a2c';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`, 'latin1');
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'latin1');
  return { contentType: `multipart/form-data; boundary=${boundary}`, body: Buffer.concat([head, buffer, tail]) };
}

function startInstance(scenario, port, sandbox, cdnHost) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SELF, 'instance', scenario, String(port), sandbox, cdnHost], {
      cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } });
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`instance ${scenario} did not become ready\n${buf}`)), 60000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = /READY (\{.*\})/.exec(buf);
      if (m) { clearTimeout(timer); resolve({ child, info: JSON.parse(m[1]), logs: () => buf }); }
    });
    child.stderr.on('data', (d) => { buf += d.toString(); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`instance ${scenario} exited (${code})\n${buf}`)); });
  });
}

const stopInstance = (h) =>
  new Promise((r) => {
    h.child.once('exit', () => r());
    h.child.kill('SIGTERM');
    setTimeout(() => { h.child.kill('SIGKILL'); r(); }, 4000);
  }).then(() => h.logs());

/** Every line an instance printed, so storage warnings can be shown in the summary. */
const instanceLogs = [];

/**
 * The scenarios write real resume revisions, so the collection is snapshotted
 * up front and restored afterwards - verification must never leave test PDFs
 * (or dangling blob references) in the production database.
 */
async function snapshotResumeCollection() {
  const mongoose = require(path.join(ROOT, 'node_modules', 'mongoose'));
  const Resume = require(path.join(ROOT, 'server', 'models', 'Resume'));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const docs = await Resume.find().lean();
  await mongoose.disconnect();
  return docs;
}

async function restoreResumeCollection(docs) {
  const mongoose = require(path.join(ROOT, 'node_modules', 'mongoose'));
  const Resume = require(path.join(ROOT, 'server', 'models', 'Resume'));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await Resume.deleteMany({});
  if (docs.length) await Resume.insertMany(docs);
  const left = await Resume.countDocuments();
  await mongoose.disconnect();
  return left;
}

async function countResumeRecords() {
  const mongoose = require(path.join(ROOT, 'node_modules', 'mongoose'));
  const Resume = require(path.join(ROOT, 'server', 'models', 'Resume'));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const n = await Resume.countDocuments();
  await mongoose.disconnect();
  return n;
}

// ------------------------------------------------------- certificate helpers --

const VERIFY_TAG = '__verify-';

async function withCertificateDb(fn) {
  const mongoose = require(path.join(ROOT, 'node_modules', 'mongoose'));
  const Certificate = require(path.join(ROOT, 'server', 'models', 'Certificate'));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    return await fn(Certificate);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * The harness only ever touches certificates it created itself, tagged with a
 * recognizable prefix, so real seeded data is never read-modified-deleted and
 * nothing has to be snapshotted and re-inserted.
 */
const purgeVerifyCerts = () =>
  withCertificateDb((C) => C.deleteMany({ title: { $regex: `^${VERIFY_TAG}` } }).then((r) => r.deletedCount));

async function createVerifyCert(port, cookie, suffix) {
  const r = await request(port, 'POST', '/api/admin/certificates', {
    cookie,
    headers: { 'x-vadmin': '1' },
    body: { title: `${VERIFY_TAG}cert-${suffix}`, provider: 'harness', order: 9999 }
  });
  const doc = jsonOf(r).data;
  if (!doc || !doc._id) {
    throw new Error(`could not create a throwaway certificate (${r.status} ${JSON.stringify(jsonOf(r)).slice(0, 200)})`);
  }
  return doc;
}

const readCert = async (port, cookie, id) => {
  const listed = jsonOf(await request(port, 'GET', '/api/admin/certificates', { cookie }));
  return (listed.data || []).find((c) => c._id === id) || null;
};

/** Local path of a blob URL inside the stand-in store. */
const storePathFor = (storeDir, url) =>
  path.join(storeDir, ...String(url || '').replace(/^https?:\/\/[^/]+\//, '').split('/').filter(Boolean));

/**
 * Fetches a blob URL through the same stand-in CDN the instance uses, so
 * "the public link works" is asserted against real bytes rather than a string.
 */
async function fetchBlob(url) {
  try {
    const res = await fetch(url);
    return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };
  } catch (err) {
    return { status: 0, buffer: Buffer.alloc(0), error: err.message };
  }
}

let portCursor = 5310 + Math.floor(Math.random() * 400);
const nextPort = () => ++portCursor;

async function login(port) {
  const r = await request(port, 'POST', '/api/admin/auth/login', {
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    headers: { 'x-vadmin': '1' }
  });
  if (r.status !== 200) {
    throw new Error(`admin login failed (${r.status} ${jsonOf(r).message || ''}) - run "npm run admin:init" so .env matches the database`);
  }
  return (r.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

(async () => {
  if (process.argv[2] === 'instance') return childMain();

  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-storage-'));
  const cdnHost = 'vercel-store-test.public.blob.vercel-storage.com';
  const storeDir = path.join(sandbox, 'blob-store');
  // Lets the driver resolve blob URLs itself, so "the public certificate link
  // serves the uploaded PDF" is asserted against real bytes rather than a string.
  installFakeBlob(storeDir, cdnHost);
  const want = (process.argv[2] || '').toUpperCase();
  const scenarios = ['A', 'B', 'C', 'D', 'E'].filter((s) => !want || want === s);
  const results = [];
  const say = (s = '') => console.log(s);
  const check = (name, pass, detail) => {
    results.push({ name, pass });
    say(`  [${pass ? 'PASS' : 'FAIL'}] ${name}`);
    if (detail) say(`         ${detail}`);
  };
  const hr = (t) => say(`\n${'='.repeat(74)}\n${t}\n${'='.repeat(74)}`);

  say(`repo    : ${ROOT}`);
  say(`sandbox : ${sandbox}`);
  say(`resume  : ${RESUME_PATH}`);

  const originalBundle = path.join(ROOT, 'public', 'assets', 'Vinit-Niwalkar-Resume.pdf');
  const hadBundle = fs.existsSync(originalBundle);
  const originalBytes = hadBundle ? fs.readFileSync(originalBundle) : null;
  const archiveDir = path.join(ROOT, 'public', 'assets', '_archive');
  const originalArchives = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir) : [];
  // Safety net: public/assets is served content, so snapshot it and put it back.
  const assetsDir = path.join(ROOT, 'public', 'assets');
  const assetsSnapshot = fs.existsSync(assetsDir)
    ? fs.readdirSync(assetsDir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => ({ name: d.name, bytes: fs.readFileSync(path.join(assetsDir, d.name)) }))
    : [];

  let dbSnapshot = null;
  try {
    dbSnapshot = await snapshotResumeCollection();
    say(`db resume records before verification: ${dbSnapshot.length}`);
  } catch (err) {
    say(`could not snapshot the resume collection (${err.message}) - verification will not restore it`);
  }

  try {
    // ---------------------------------------------------------------- A ----
    if (scenarios.includes('A')) {
      hr('SCENARIO A - Vercel runtime, read-only bundle  (the production bug)');
      const port = nextPort();
      const inst = await startInstance('A', port, sandbox, cdnHost);
      say(`  provider reported: ${inst.info.provider}`);
      const cookie = await login(port);

      const before = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume  -> ${JSON.stringify(before.data)}`);

      const pdf = makePdf('uploaded-in-A');
      const post = await request(port, 'POST', '/api/admin/resume', {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(pdf, 'A.pdf') });
      say(`  POST /api/admin/resume  -> ${post.status} ${JSON.stringify(jsonOf(post)).slice(0, 200)}`);

      const after = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume  -> ${JSON.stringify(after.data)}`);

      const dl = await request(port, 'GET', RESUME_PATH);
      say(`  GET  ${RESUME_PATH} -> ${dl.status} ${dl.buffer.length} bytes, body "${pdfLabel(dl)}"`);
      const records = await countResumeRecords();

      check('A1  "Upload & replace" fails loudly instead of silently claiming success',
        post.status >= 400, `HTTP ${post.status} ${jsonOf(post).message || ''}`);
      check('A2  no resume record is created when storage rejects the upload',
        records === dbSnapshot.length, `resume records: ${records} (was ${dbSnapshot.length})`);
      check('A3  public resume keeps serving the bundled original',
        pdfLabel(dl) !== 'uploaded-in-A', `served "${pdfLabel(dl)}"`);
      check('A4  admin panel reports a real size (old symptom: "unknown")',
        !!(after.data && after.data.size), `size=${after.data && after.data.size}`);
      check('A5  admin panel reports a real date (old symptom: "-")',
        !!(after.data && after.data.uploadedAt), `uploadedAt=${after.data && after.data.uploadedAt}`);
      check('A6  the public url is a usable path, not "[object Object]"',
        after.data && after.data.url === RESUME_PATH, `url=${after.data && after.data.url}`);

      // The certificate CMS is the second caller of the same broken helper.
      const cert = await createVerifyCert(port, cookie, 'a');
      const certUp = await request(port, 'POST', `/api/admin/certificates/${cert._id}/file`, {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(makePdf('certificate-in-A'), 'cert.pdf') });
      const certRow = await readCert(port, cookie, cert._id);
      say(`  POST /api/admin/certificates/:id/file -> ${certUp.status} ${JSON.stringify(jsonOf(certUp)).slice(0, 160)}`);
      check('A7  certificate upload is refused too, not silently "accepted"',
        certUp.status >= 400, `HTTP ${certUp.status} ${jsonOf(certUp).message || ''}`);
      check('A8  the certificate never claims a file that was never stored',
        !(certRow && certRow.file), `file="${certRow && certRow.file}"`);

      await stopInstance(inst).then((l) => instanceLogs.push(l));
    }

    // ---------------------------------------------------------------- B ----
    if (scenarios.includes('B')) {
      hr('SCENARIO B - Vercel runtime, writable /tmp only  (silent data loss)');
      const port = nextPort();
      const inst = await startInstance('B', port, sandbox, cdnHost);
      say(`  provider reported: ${inst.info.provider}`);
      const cookie = await login(port);

      const pdf = makePdf('uploaded-in-B');
      const post = await request(port, 'POST', '/api/admin/resume', {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(pdf, 'B.pdf') });
      say(`  POST /api/admin/resume  -> ${post.status} ${JSON.stringify(jsonOf(post)).slice(0, 200)}`);
      const after = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume  -> ${JSON.stringify(after.data)}`);
      const dl = await request(port, 'GET', RESUME_PATH);
      say(`  GET  ${RESUME_PATH} -> ${dl.status} ${dl.buffer.length} bytes, body "${pdfLabel(dl)}"`);

      check('B1  upload to an ephemeral filesystem is refused, never faked', post.status >= 400,
        `HTTP ${post.status} ${jsonOf(post).message || ''}`);
      check('B2  the served resume is left exactly as it was', pdfLabel(dl) !== 'uploaded-in-B',
        `served "${pdfLabel(dl)}" - a write to /tmp can never be served`);

      await stopInstance(inst).then((l) => instanceLogs.push(l));

      const port2 = nextPort();
      const inst2 = await startInstance('B', port2, sandbox, cdnHost);
      const cookie2 = await login(port2);
      const dl2 = await request(port2, 'GET', RESUME_PATH);
      const meta2 = jsonOf(await request(port2, 'GET', '/api/admin/resume', { cookie: cookie2 }));
      const records2 = await countResumeRecords();
      say(`  [cold start] GET ${RESUME_PATH} -> ${dl2.status} body "${pdfLabel(dl2)}"`);
      say(`  [cold start] GET /api/admin/resume -> ${JSON.stringify(meta2.data)}`);
      check('B3  nothing was written that a cold start could lose', pdfLabel(dl2) !== 'uploaded-in-B',
        `served "${pdfLabel(dl2)}"`);
      check('B4  database and storage stay in sync (no phantom revision)',
        records2 === dbSnapshot.length, `resume records: ${records2} (was ${dbSnapshot.length})`);
      await stopInstance(inst2).then((l) => instanceLogs.push(l));
    }

    // ---------------------------------------------------------------- C ----
    if (scenarios.includes('C')) {
      hr('SCENARIO C - Vercel runtime + Vercel Blob  (the fix)');
      const port = nextPort();
      const inst = await startInstance('C', port, sandbox, cdnHost);
      say(`  provider reported: ${inst.info.provider} (pid ${inst.info.pid})`);
      const cookie = await login(port);

      const before = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume  -> ${JSON.stringify(before.data)}`);

      const pdf = makePdf('uploaded-in-C-1');
      const post = await request(port, 'POST', '/api/admin/resume', {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(pdf, 'first.pdf') });
      say(`  POST /api/admin/resume  -> ${post.status} ${JSON.stringify(jsonOf(post)).slice(0, 240)}`);

      const after = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume  -> ${JSON.stringify(after.data)}`);

      const head = await request(port, 'HEAD', RESUME_PATH);
      const dl = await request(port, 'GET', RESUME_PATH);
      say(`  HEAD ${RESUME_PATH} -> ${head.status} ${head.headers['content-type'] || ''} ${head.headers['content-length'] || ''}b`);
      say(`  GET  ${RESUME_PATH} -> ${dl.status} ${dl.headers['content-type'] || ''} "${dl.headers['content-disposition'] || ''}" ${dl.buffer.length} bytes, body "${pdfLabel(dl)}"`);

      check('C1  provider resolves to vercel-blob in production', inst.info.provider === 'vercel-blob', `PROVIDER=${inst.info.provider}`);
      check('C2  "Upload & replace" succeeds', post.status === 200, `HTTP ${post.status} ${jsonOf(post).message || ''}`);
      check('C3  active resume changes (public route serves the new PDF)', dl.status === 200 && pdfLabel(dl) === 'uploaded-in-C-1',
        `served "${pdfLabel(dl)}"`);
      check('C4  size updates in the admin panel', after.data && after.data.size === pdf.length,
        `size=${after.data && after.data.size} expected=${pdf.length}`);
      check('C5  last-uploaded date updates in the admin panel', !!(after.data && after.data.uploadedAt),
        `uploadedAt=${after.data && after.data.uploadedAt}`);
      check('C6  public URL stays stable', after.data && after.data.url === RESUME_PATH, `url=${after.data && after.data.url}`);
      check('C7  served as a PDF attachment (download attribute keeps working)',
        /application\/pdf/.test(dl.headers['content-type'] || '') && /attachment/.test(dl.headers['content-disposition'] || ''),
        `${dl.headers['content-type']} | ${dl.headers['content-disposition']}`);
      check('C8  HEAD guard used by the public page answers 200', head.status === 200, `HEAD ${head.status}`);
      check('C9  response is not cacheable, so a replaced resume is never stale',
        /no-store/.test(dl.headers['cache-control'] || ''), `cache-control=${dl.headers['cache-control']}`);
      check('C10 admin reports the active revision as present in storage',
        !!(after.data && after.data.present), `present=${after.data && after.data.present}`);
      const listBlobs = () => {
        const dir = path.join(storeDir, 'resumes');
        return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
      };
      say(`  blob store: ${JSON.stringify(listBlobs())}`);

      await stopInstance(inst).then((l) => instanceLogs.push(l));

      // ---- fresh deployment: new pid, new /tmp, only Mongo + blob persist --
      hr('SCENARIO C - cold start (fresh function invocation / redeploy)');
      const port2 = nextPort();
      const inst2 = await startInstance('C', port2, sandbox, cdnHost);
      say(`  new instance pid ${inst2.info.pid} (previous was ${inst.info.pid})`);
      const cookie2 = await login(port2);
      const dl2 = await request(port2, 'GET', RESUME_PATH);
      const meta2 = jsonOf(await request(port2, 'GET', '/api/admin/resume', { cookie: cookie2 }));
      say(`  GET  ${RESUME_PATH} -> ${dl2.status} ${dl2.buffer.length} bytes, body "${pdfLabel(dl2)}"`);
      say(`  GET  /api/admin/resume -> ${JSON.stringify(meta2.data)}`);

      check('C11 new file still served after a fresh invocation', dl2.status === 200 && pdfLabel(dl2) === 'uploaded-in-C-1',
        `served "${pdfLabel(dl2)}"`);
      check('C12 bytes are byte-identical to the upload', Buffer.compare(dl2.buffer, pdf) === 0,
        `${dl2.buffer.length} vs ${pdf.length} bytes`);
      check('C13 metadata survives the cold start', meta2.data && meta2.data.size === pdf.length && !!meta2.data.uploadedAt,
        JSON.stringify(meta2.data));
      check('C14 admin still reports the revision as present after the cold start',
        !!(meta2.data && meta2.data.present), `present=${meta2.data && meta2.data.present}`);

      // ---- second upload: previous revision must be preserved --------------
      hr('SCENARIO C - second upload preserves the previous resume');
      const pdf2 = makePdf('uploaded-in-C-2');
      const post2 = await request(port2, 'POST', '/api/admin/resume', {
        cookie: cookie2, headers: { 'x-vadmin': '1' }, raw: multipart(pdf2, 'second.pdf') });
      const meta3 = jsonOf(await request(port2, 'GET', '/api/admin/resume', { cookie: cookie2 }));
      const dl3 = await request(port2, 'GET', RESUME_PATH);
      const blobs = listBlobs();
      say(`  POST /api/admin/resume -> ${post2.status}`);
      say(`  blob store: ${JSON.stringify(blobs)}`);
      say(`  archive:    ${JSON.stringify(meta3.data && meta3.data.archive)}`);

      check('C15 second upload becomes active', post2.status === 200 && pdfLabel(dl3) === 'uploaded-in-C-2',
        `served "${pdfLabel(dl3)}"`);
      check('C16 both revisions still exist in blob storage', blobs.length >= 2, JSON.stringify(blobs));
      check('C17 the replaced revision is recorded in the CMS archive',
        !!(meta3.data && Array.isArray(meta3.data.archive) && meta3.data.archive.length >= 1),
        JSON.stringify(meta3.data && meta3.data.archive));
      const archived = meta3.data && meta3.data.archive && meta3.data.archive[0];
      check('C18 the archived revision is still fetchable from its own url', !!(archived && archived.storageUrl &&
        fs.existsSync(path.join(storeDir, ...String(archived.storageUrl).replace(/^https?:\/\/[^/]+\//, '').split('/')))),
        archived && archived.storageUrl);

      // ---- a non-PDF must be rejected, DB untouched -----------------------
      hr('SCENARIO C - rejection path leaves the active resume alone');
      const junk = Buffer.from('this is definitely not a pdf');
      const bad = await request(port2, 'POST', '/api/admin/resume', {
        cookie: cookie2, headers: { 'x-vadmin': '1' }, raw: multipart(junk, 'resume.pdf') });
      const meta4 = jsonOf(await request(port2, 'GET', '/api/admin/resume', { cookie: cookie2 }));
      const dl4 = await request(port2, 'GET', RESUME_PATH);
      say(`  POST /api/admin/resume (not a PDF) -> ${bad.status} ${JSON.stringify(jsonOf(bad)).slice(0, 160)}`);
      check('C19 non-PDF upload is rejected with 4xx', bad.status >= 400 && bad.status < 500, `HTTP ${bad.status}`);
      check('C20 the active resume is untouched after a rejected upload',
        pdfLabel(dl4) === 'uploaded-in-C-2' && meta4.data.size === pdf2.length, `served "${pdfLabel(dl4)}"`);

      await stopInstance(inst2).then((l) => instanceLogs.push(l));
    }

    // ---------------------------------------------------------------- D ----
    if (scenarios.includes('D')) {
      hr('SCENARIO D - local development (npm start, no Vercel, no blob token)');
      const port = nextPort();
      const inst = await startInstance('D', port, sandbox, cdnHost);
      say(`  provider reported: ${inst.info.provider}`);
      const cookie = await login(port);

      const archiveDir = path.join(ROOT, 'public', 'assets', '_archive');
      const archivesBefore = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir).length : 0;
      const bundledBytes = fs.readFileSync(path.join(ROOT, 'public', 'assets', 'Vinit-Niwalkar-Resume.pdf'));

      const pdf = makePdf('uploaded-locally');
      const post = await request(port, 'POST', '/api/admin/resume', {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(pdf, 'local.pdf') });
      say(`  POST /api/admin/resume -> ${post.status} ${JSON.stringify(jsonOf(post)).slice(0, 200)}`);
      const after = jsonOf(await request(port, 'GET', '/api/admin/resume', { cookie }));
      say(`  GET  /api/admin/resume -> ${JSON.stringify(after.data)}`);
      const dl = await request(port, 'GET', RESUME_PATH);
      say(`  GET  ${RESUME_PATH} -> ${dl.status} ${dl.headers['content-disposition'] || ''} ${dl.buffer.length} bytes, body "${pdfLabel(dl)}"`);
      const archivesAfter = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir) : [];

      check('D1  provider falls back to the local filesystem', inst.info.provider === 'local', `PROVIDER=${inst.info.provider}`);
      check('D2  local upload succeeds', post.status === 200, `HTTP ${post.status} ${jsonOf(post).message || ''}`);
      check('D3  public route serves the freshly uploaded file', pdfLabel(dl) === 'uploaded-locally', `served "${pdfLabel(dl)}"`);
      check('D4  size and date are reported', after.data && after.data.size === pdf.length && !!after.data.uploadedAt,
        `size=${after.data && after.data.size}`);
      check('D5  the previous resume is archived, not destroyed',
        archivesAfter.length === archivesBefore + 1, `_archive: ${archivesBefore} -> ${archivesAfter.length}`);
      check('D6  the archive holds the exact bytes that were replaced',
        archivesAfter.some((f) => {
          try { return Buffer.compare(fs.readFileSync(path.join(archiveDir, f)), bundledBytes) === 0; } catch (_) { return false; }
        }), archivesAfter.slice(-1)[0] || 'none');
      check('D7  provider is reported to the admin panel', after.data && after.data.storageProvider === 'local',
        `storageProvider=${after.data && after.data.storageProvider}`);

      // restore the working tree exactly as it was
      fs.writeFileSync(path.join(ROOT, 'public', 'assets', 'Vinit-Niwalkar-Resume.pdf'), bundledBytes);
      const extra = archivesAfter.filter((f) => !originalArchives.includes(f));
      for (const f of extra) fs.rmSync(path.join(archiveDir, f), { force: true });
      say(`  cleaned ${extra.length} archive file(s) created by this scenario`);

      await stopInstance(inst).then((l) => instanceLogs.push(l));
    }

    // ---------------------------------------------------------------- E ----
    if (scenarios.includes('E')) {
      hr('SCENARIO E - certificate PDFs on Vercel Blob  (the same bug, second caller)');
      say('  certificates used to be written straight into public/certificates/, so every');
      say('  certificate upload failed in production exactly like the resume did.');
      await purgeVerifyCerts();

      const port = nextPort();
      const inst = await startInstance('C', port, sandbox, cdnHost);
      say(`  provider reported: ${inst.info.provider} (pid ${inst.info.pid})`);
      const cookie = await login(port);
      const cert = await createVerifyCert(port, cookie, 'e1');
      say(`  created throwaway certificate ${cert._id}`);

      // ---- upload 1 ---------------------------------------------------------
      const pdf = makePdf('certificate-uploaded-in-E');
      const up = await request(port, 'POST', `/api/admin/certificates/${cert._id}/file`, {
        cookie, headers: { 'x-vadmin': '1' }, raw: multipart(pdf, 'cert.pdf') });
      say(`  POST /api/admin/certificates/:id/file -> ${up.status} ${JSON.stringify(jsonOf(up)).slice(0, 200)}`);
      const row = await readCert(port, cookie, cert._id);
      const fileUrl = row && row.file;
      say(`  certificate.file = ${fileUrl}`);
      const firstStorePath = storePathFor(storeDir, fileUrl);
      const served = fileUrl ? await fetchBlob(fileUrl) : { status: 0, buffer: Buffer.alloc(0) };

      check('E1  certificate upload succeeds on the blob provider', up.status === 200,
        `HTTP ${up.status} ${jsonOf(up).message || ''}`);
      check('E2  the file is a durable blob object, not a path inside the bundle',
        !!fileUrl && /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/certificates\//.test(fileUrl), `file=${fileUrl}`);
      check('E3  the bytes actually reached storage', fs.existsSync(firstStorePath), firstStorePath);
      check('E4  the public certificate link serves the uploaded PDF',
        served.status === 200 && pdfLabel(served) === 'certificate-uploaded-in-E',
        `HTTP ${served.status} "${pdfLabel(served)}" ${served.buffer.length} bytes`);

      // ---- nothing was written into the served bundle -----------------------
      const leaked = path.join(ROOT, 'public', 'certificates', path.basename(String(fileUrl || '')));
      check('E5  nothing was written into the read-only deployment bundle',
        !fileUrl || !fs.existsSync(leaked), `public/certificates/${path.basename(String(fileUrl || ''))}`);

      await stopInstance(inst).then((l) => instanceLogs.push(l));

      // ---- cold start -------------------------------------------------------
      hr('SCENARIO E - certificate survives a cold start (fresh function invocation)');
      const port2 = nextPort();
      const inst2 = await startInstance('C', port2, sandbox, cdnHost);
      say(`  new instance pid ${inst2.info.pid} (previous was ${inst.info.pid})`);
      const cookie2 = await login(port2);
      const publicList = jsonOf(await request(port2, 'GET', '/api/certificates'));
      const publicRow = (publicList.data || []).find((c) => c._id === cert._id);
      const served2 = publicRow && publicRow.file ? await fetchBlob(publicRow.file) : { status: 0, buffer: Buffer.alloc(0) };
      say(`  GET /api/certificates -> file=${publicRow && publicRow.file}`);
      check('E6  the public API still advertises the file after a cold start',
        !!(publicRow && publicRow.file), `file=${publicRow && publicRow.file}`);
      check('E7  the file is still downloadable byte-for-byte after a cold start',
        served2.status === 200 && Buffer.compare(served2.buffer, pdf) === 0,
        `HTTP ${served2.status} ${served2.buffer.length} vs ${pdf.length} bytes`);

      // ---- a non-PDF must be rejected --------------------------------------
      const bad = await request(port2, 'POST', `/api/admin/certificates/${cert._id}/file`, {
        cookie: cookie2, headers: { 'x-vadmin': '1' }, raw: multipart(Buffer.from('not a pdf'), 'cert.pdf') });
      const afterBad = await readCert(port2, cookie2, cert._id);
      say(`  POST /api/admin/certificates/:id/file (not a PDF) -> ${bad.status}`);
      check('E8  a non-PDF certificate is rejected with 4xx', bad.status >= 400 && bad.status < 500, `HTTP ${bad.status}`);
      check('E9  the existing certificate file is untouched after a rejected upload',
        !!(afterBad && afterBad.file) && fs.existsSync(firstStorePath), `file=${afterBad && afterBad.file}`);

      // ---- replace: the superseded object must be deleted -------------------
      const pdf2 = makePdf('certificate-uploaded-in-E-2');
      const up2 = await request(port2, 'POST', `/api/admin/certificates/${cert._id}/file`, {
        cookie: cookie2, headers: { 'x-vadmin': '1' }, raw: multipart(pdf2, 'cert2.pdf') });
      const row2 = await readCert(port2, cookie2, cert._id);
      const secondUrl = row2 && row2.file;
      const secondStorePath = storePathFor(storeDir, secondUrl);
      const served3 = secondUrl ? await fetchBlob(secondUrl) : { status: 0, buffer: Buffer.alloc(0) };
      say(`  replaced -> ${secondUrl}`);
      check('E10 replacing a certificate deletes the superseded blob object',
        up2.status === 200 && secondUrl !== fileUrl && !fs.existsSync(firstStorePath),
        `superseded ${path.basename(firstStorePath)} exists=${fs.existsSync(firstStorePath)}`);
      check('E11 the replacement is what the public page links to',
        served3.status === 200 && pdfLabel(served3) === 'certificate-uploaded-in-E-2',
        `HTTP ${served3.status} "${pdfLabel(served3)}"`);

      // ---- remove -----------------------------------------------------------
      const rm = await request(port2, 'DELETE', `/api/admin/certificates/${cert._id}/file`, {
        cookie: cookie2, headers: { 'x-vadmin': '1' } });
      const row3 = await readCert(port2, cookie2, cert._id);
      say(`  DELETE /api/admin/certificates/:id/file -> ${rm.status}`);
      check('E12 removing the file clears the document and deletes the blob object',
        rm.status === 200 && !(row3 && row3.file) && !fs.existsSync(secondStorePath),
        `file="${row3 && row3.file}" blob exists=${fs.existsSync(secondStorePath)}`);

      // ---- and the throwaway document is gone -------------------------------
      const del = await request(port2, 'DELETE', `/api/admin/certificates/${cert._id}`, {
        cookie: cookie2, headers: { 'x-vadmin': '1' } });
      check('E13 the throwaway certificate is removed', del.status === 200, `HTTP ${del.status}`);

      await stopInstance(inst2).then((l) => instanceLogs.push(l));
    }
  } catch (err) {
    say(`\nHARNESS ERROR: ${err && err.message}`);
    results.push({ name: 'harness completed', pass: false });
  } finally {
    if (hadBundle && !fs.existsSync(originalBundle)) fs.writeFileSync(originalBundle, originalBytes);
    // restore public/assets to its exact pre-verification contents
    if (fs.existsSync(assetsDir)) {
      for (const d of fs.readdirSync(assetsDir, { withFileTypes: true })) {
        if (d.isFile() && !assetsSnapshot.some((s) => s.name === d.name)) {
          fs.rmSync(path.join(assetsDir, d.name), { force: true });
          say(`removed stray file created by verification: ${d.name}`);
        }
      }
      for (const s of assetsSnapshot) {
        const p = path.join(assetsDir, s.name);
        if (!fs.existsSync(p) || Buffer.compare(fs.readFileSync(p), s.bytes) !== 0) fs.writeFileSync(p, s.bytes);
      }
    }
    for (const f of fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir) : []) {
      if (!originalArchives.includes(f)) fs.rmSync(path.join(archiveDir, f), { force: true });
    }
    try {
      const purged = await purgeVerifyCerts();
      if (purged) say(`removed ${purged} throwaway certificate(s) left by verification`);
    } catch (err) {
      say(`WARNING: could not remove throwaway certificates (${err.message})`);
    }
    if (dbSnapshot) {
      try {
        const left = await restoreResumeCollection(dbSnapshot);
        say(`\ndb resume records restored to their pre-verification state (${left})`);
      } catch (err) {
        say(`\nWARNING: could not restore the resume collection (${err.message})`);
      }
    }
  }

  hr('SUMMARY');
  const storageWarnings = instanceLogs
    .join('\n')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\[storage\]|BlobError|BlobStoreNotFound|blob delete/i.test(l));
  if (storageWarnings.length) {
    say('\n  storage warnings raised by the instances:');
    for (const w of [...new Set(storageWarnings)]) say(`    ${w}`);
  }
  const failed = results.filter((r) => !r.pass);
  for (const r of results) say(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
  say(`\n  ${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
