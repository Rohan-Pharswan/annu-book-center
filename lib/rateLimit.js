const ipStore = new Map();

export function checkRateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const bucket = ipStore.get(key) || [];

  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  ipStore.set(key, recent);

  return {
    ok: recent.length <= limit,
    remaining: Math.max(0, limit - recent.length),
    resetInMs: windowMs
  };
}

