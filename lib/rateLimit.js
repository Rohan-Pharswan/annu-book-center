const ipStore = new Map();

// Sweep stale keys every 5 minutes to prevent unbounded memory growth.
// Keys whose newest timestamp is older than MAX_WINDOW_MS are removed entirely.
const MAX_WINDOW_MS = 5 * 60_000; // 5 minutes — the longest window any caller uses
const CLEANUP_INTERVAL_MS = 5 * 60_000;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of ipStore.entries()) {
    const fresh = timestamps.filter((ts) => now - ts < MAX_WINDOW_MS);
    if (fresh.length === 0) {
      ipStore.delete(key);
    } else {
      ipStore.set(key, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Allow the Node.js process to exit even if this interval is still active.
if (cleanupInterval.unref) cleanupInterval.unref();

export function checkRateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const bucket = ipStore.get(key) || [];

  // Keep only timestamps within the current window
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  ipStore.set(key, recent);

  return {
    ok: recent.length <= limit,
    remaining: Math.max(0, limit - recent.length),
    resetInMs: windowMs
  };
}

// Exported for testing only
export function _getRateLimitStoreSize() {
  return ipStore.size;
}


