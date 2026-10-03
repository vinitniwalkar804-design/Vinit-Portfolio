const nodemailer = require('nodemailer');

// Config is resolved lazily (on each call) instead of being snapshotted at
// require() time. This keeps the module correct no matter when it is first
// loaded relative to dotenv, and makes the values visible to diagnostics.
function readConfig() {
  const host = (process.env.EMAIL_HOST || '').trim();
  const portRaw = (process.env.EMAIL_PORT || '').trim();
  const port = Number(portRaw || (host ? 587 : 0));
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = process.env.EMAIL_PASSWORD || '';
  const receiver = (process.env.CONTACT_RECEIVER || '').trim();
  const fromName = (process.env.EMAIL_FROM_NAME || 'Portfolio Contact').trim();

  return {
    host,
    port,
    portRaw,
    portValid: portRaw === '' || Number.isFinite(port),
    secure,
    user,
    pass,
    receiver,
    fromName,
    connectionTimeoutMs: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeoutMs: Number(process.env.EMAIL_GREETING_TIMEOUT_MS) || 10000,
    socketTimeoutMs: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS) || 15000
  };
}

// Gmail/most SMTP servers expect a bare mailbox address here. A value that is
// not a valid address shape (for example a connection string that was pasted
// into the wrong variable) passes an "is it non-empty?" check but can never
// authenticate, so it is reported explicitly.
function userLooksValid(user) {
  return /^[^\s@:]+@[^\s@:]+\.[^\s@:]+$/.test(user);
}

function missingVars(cfg) {
  const missing = [];
  if (!cfg.host) missing.push('EMAIL_HOST');
  if (!cfg.user) missing.push('EMAIL_USER');
  if (!cfg.pass) missing.push('EMAIL_PASSWORD');
  if (!cfg.portValid || cfg.port <= 0) missing.push('EMAIL_PORT');
  return missing;
}

function isEmailConfigured() {
  return missingVars(readConfig()).length === 0;
}

// Maps an SMTP/nodemailer error onto the four outcomes that matter for triage.
// Keeping this in one place means the contact endpoint, the admin auth
// endpoint and the logs all report the same category for the same failure.
function classifyEmailError(err) {
  if (!err) return 'UNKNOWN';
  if (err.emailNotConfigured) return 'NOT_CONFIGURED';
  if (err.emailInvalidUser) return 'SMTP_CONFIG_INVALID';

  const code = String(err.code || err.responseCode || err.command || '');
  const msg = String(err.message || '');
  const haystack = code + ' ' + msg;

  if (/^EAUTH|^(534|535|530|538|5\.7\.8)/.test(code) ||
      /Invalid (login|credentials)|Username and Password|Authentication (failed|unsupported)|too many failed/i.test(haystack)) {
    return 'SMTP_AUTH_FAILURE';
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|EPIPE|ETIMEDOUT|ETIME|EHOSTUNREACH|ENETUNREACH|ENETDOWN|EHOSTDOWN|UND_ERR|EAI_FAIL|ECONNABORTED/.test(code)) {
    return 'SMTP_CONNECTION_FAILURE';
  }
  if (/ETIMEDOUT|ESOCKETTIMEDOUT|timed? ?out|Timeout/i.test(haystack)) {
    return 'SMTP_TIMEOUT';
  }
  if (/^EMESSAGE|^EENVELOPE|550|551|553|554/.test(code)) {
    return 'SMTP_REJECTED';
  }
  return 'SMTP_OTHER_FAILURE';
}

// Compact, secret-free description of an SMTP error for the logs.
function describeEmailError(err) {
  if (!err) return { classification: 'UNKNOWN' };
  return {
    classification: classifyEmailError(err),
    name: err.name || null,
    code: err.code || null,
    command: err.command || null,
    responseCode: err.responseCode != null ? err.responseCode : null,
    errno: err.errno || null,
    syscall: err.syscall || null,
    address: err.address || null,
    port: err.port != null ? err.port : null,
    message: err.message ? String(err.message).split('\n')[0].slice(0, 300) : null
  };
}

// Safe to log or expose over HTTP: presence, shape and length only.
// Never returns the password or the full mailbox address.
function getEmailDiagnostics() {
  const cfg = readConfig();
  const missing = missingVars(cfg);
  const userValid = userLooksValid(cfg.user);
  const domain = cfg.user.includes('@') ? cfg.user.split('@').pop() : null;

  return {
    configured: missing.length === 0,
    missing,
    host: cfg.host || null,
    port: cfg.port,
    portValid: cfg.portValid,
    secure: cfg.secure,
    tlsMode: cfg.secure ? 'implicit TLS (465)' : 'STARTTLS (587)',
    userSet: Boolean(cfg.user),
    userLength: cfg.user.length,
    userValidShape: userValid,
    userLooksLikeUri: /:\/\//.test(cfg.user),
    userDomain: domain,
    passwordSet: Boolean(cfg.pass),
    passwordLength: cfg.pass.length,
    // Gmail app passwords are 16 chars and contain no spaces. Both are common
    // copy/paste mistakes that surface as an auth failure, not a config error.
    passwordLooksLikeAppPassword: cfg.pass.length === 16,
    passwordHasWhitespace: /\s/.test(cfg.pass),
    receiverSet: Boolean(cfg.receiver),
    receiverEqualsUser: Boolean(cfg.receiver) && cfg.receiver === cfg.user,
    timeouts: {
      connection: cfg.connectionTimeoutMs,
      greeting: cfg.greetingTimeoutMs,
      socket: cfg.socketTimeoutMs
    }
  };
}

// One-time startup line so a Vercel function log shows immediately whether the
// mail path is usable, without revealing any secret.
let startupLogged = false;
function logEmailStartup() {
  if (startupLogged) return;
  startupLogged = true;
  const d = getEmailDiagnostics();

  if (!d.configured) {
    console.warn(
      `[email] SMTP NOT configured on this runtime. Missing: ${d.missing.join(', ') || 'none'}. ` +
        'Contact messages will still be saved to MongoDB, but no notification email will be sent.'
    );
    return;
  }

  console.log(
    `[email] SMTP configured | host=${d.host} port=${d.port} mode=${d.tlsMode} | ` +
      `user=${d.userSet ? `set(len=${d.userLength}, domain=${d.userDomain})` : 'NOT set'}` +
      `${d.userValidShape ? '' : ' INVALID-SHAPE'}${d.userLooksLikeUri ? ' LOOKS-LIKE-URI' : ''} | ` +
      `password=${d.passwordSet ? `set(len=${d.passwordLength})` : 'NOT set'}` +
      `${d.passwordHasWhitespace ? ' CONTAINS-WHITESPACE' : ''} | ` +
      `receiver=${d.receiverSet ? 'set' : 'NOT set (falls back to hardcoded default)'}`
  );

  if (!d.userValidShape || d.userLooksLikeUri) {
    console.error(
      `[email] EMAIL_USER is not a valid mailbox address. Gmail will reject this with ` +
        `535 / EAUTH even though the variable is non-empty. Fix EMAIL_USER in this environment.`
    );
  }
  if (d.passwordHasWhitespace) {
    console.error('[email] EMAIL_PASSWORD contains whitespace — strip the spaces (Google App Passwords are 16 chars with no spaces).');
  }
  if (d.userSet && d.receiverSet && d.receiverEqualsUser) {
    console.log('[email] CONTACT_RECEIVER is the same mailbox as EMAIL_USER (self-send; watch Gmail quota and spam placement).');
  }
}

function getTransporter() {
  const cfg = readConfig();
  const missing = missingVars(cfg);
  if (missing.length) {
    const err = new Error(
      `Email is not configured. Missing environment variable(s): ${missing.join(', ')}`
    );
    err.emailNotConfigured = true;
    err.missing = missing;
    throw err;
  }

  if (!userLooksValid(cfg.user)) {
    const err = new Error(
      `EMAIL_USER is not a valid mailbox address (length ${cfg.user.length}). Authentication will fail.`
    );
    err.emailNotConfigured = false;
    err.emailInvalidUser = true;
    throw err;
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: cfg.connectionTimeoutMs,
    greetingTimeout: cfg.greetingTimeoutMs,
    socketTimeout: cfg.socketTimeoutMs,
    logger: false,
    debug: false
  });
}

module.exports = {
  isEmailConfigured,
  getTransporter,
  getEmailDiagnostics,
  classifyEmailError,
  describeEmailError,
  logEmailStartup,
  readConfig,
  get EMAIL_USER() {
    return readConfig().user;
  }
};
