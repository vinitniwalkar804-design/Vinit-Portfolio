/**
 * Lightweight in-memory sliding-window rate limiter.
 * Suitable for a single-admin system. Not for multi-instance production.
 */
function createRateLimiter(options) {
  const { windowMs = 15 * 60 * 1000, max = 10, keyFn, name = 'rate' } = options;
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, arr] of hits) {
      while (arr.length && arr[0] <= now - windowMs) arr.shift();
      if (!arr.length) hits.delete(key);
    }
  }, 60 * 1000).unref();

  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    const now = Date.now();
    const arr = hits.get(key) || [];
    while (arr.length && arr[0] <= now - windowMs) arr.shift();

    if (arr.length >= max) {
      const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again shortly.'
      });
    }

    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

module.exports = { createRateLimiter };