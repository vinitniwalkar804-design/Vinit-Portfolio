const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX = {
  name: 120,
  title: 160,
  text: 5000,
  tags: 60,
  url: 500
};

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function optionalStr(value, max = MAX.text) {
  const s = cleanString(value);
  if (!s) return '';
  return s.slice(0, max);
}

function requiredStr(value, max, fieldName) {
  const s = cleanString(value);
  if (!s) throw new Error(`${fieldName} is required.`);
  return s.slice(0, max);
}

function cleanArray(value, maxItems = 40) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => cleanString(v))
    .filter(Boolean)
    .slice(0, maxItems)
    .map((v) => v.slice(0, MAX.tags));
}

function cleanUrl(value) {
  const s = cleanString(value);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return '';
  return s.slice(0, MAX.url);
}

function cleanEmail(value) {
  const s = cleanString(value).toLowerCase();
  if (!EMAIL_RE.test(s)) throw new Error('A valid email is required.');
  return s.slice(0, 254);
}

function cleanOrder(value, fallback = 0) {
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(9999, Math.round(n)));
}

module.exports = {
  EMAIL_RE,
  optionalStr,
  requiredStr,
  cleanArray,
  cleanUrl,
  cleanEmail,
  cleanOrder,
  cleanString
};