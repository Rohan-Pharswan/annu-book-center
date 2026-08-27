import assert from "node:assert";

// Simulation test of ensureAuthenticated logic
let eventDispatched = null;
globalThis.window = {
  location: { pathname: "/products/123", search: "?sort=asc" },
  dispatchEvent: (event) => {
    eventDispatched = event;
  }
};

class CustomEvent {
  constructor(name, init) {
    this.type = name;
    this.detail = init?.detail;
  }
}
globalThis.CustomEvent = CustomEvent;

async function simulateEnsureAuthenticated(user, isInitialLoading, liveCheckFn, action = "cart") {
  eventDispatched = null;
  if (!isInitialLoading && !user) {
    // Open auth modal directly
    globalThis.window.dispatchEvent(
      new CustomEvent("open-auth-modal", {
        detail: {
          action,
          returnUrl: globalThis.window.location.pathname + globalThis.window.location.search
        }
      })
    );
    return false;
  }

  const { isAuthenticated } = await liveCheckFn();
  if (!isAuthenticated) {
    globalThis.window.dispatchEvent(
      new CustomEvent("open-auth-modal", {
        detail: {
          action,
          returnUrl: globalThis.window.location.pathname + globalThis.window.location.search
        }
      })
    );
    return false;
  }

  return true;
}

async function simulateAddToCart(user, isInitialLoading, liveCheckFn, apiCartCallRecorder, productId) {
  const isAuthed = await simulateEnsureAuthenticated(user, isInitialLoading, liveCheckFn, "cart");
  if (!isAuthed) {
    // Must NOT call api
    return { success: false, reason: "auth_required" };
  }

  // If authed, proceed to cart api
  apiCartCallRecorder.called = true;
  apiCartCallRecorder.productId = productId;
  return { success: true, reason: "added" };
}

// TEST 1: Logged-out user clicks Add to Cart
console.log("--- Test 1: Logged-out user clicks Add to Cart ---");
let apiRecorder1 = { called: false };
const res1 = await simulateAddToCart(null, false, async () => ({ isAuthenticated: false, user: null }), apiRecorder1, "book_101");

assert.strictEqual(res1.success, false, "Result must be false for unauthenticated user");
assert.strictEqual(apiRecorder1.called, false, "CRITICAL: /api/cart was NOT called!");
assert.strictEqual(eventDispatched?.type, "open-auth-modal", "Auth modal event was dispatched");
assert.strictEqual(eventDispatched?.detail?.action, "cart", "Action is 'cart'");
assert.strictEqual(eventDispatched?.detail?.returnUrl, "/products/123?sort=asc", "Return URL is preserved");
console.log("✓ PASS: Logged-out user immediately triggered Login popup and did NOT call /api/cart");

// TEST 2: Logged-in user clicks Add to Cart
console.log("\n--- Test 2: Logged-in user clicks Add to Cart ---");
let apiRecorder2 = { called: false };
const loggedInUser = { _id: "user_999", name: "Rohan", email: "user@example.com" };
const res2 = await simulateAddToCart(loggedInUser, false, async () => ({ isAuthenticated: true, user: loggedInUser }), apiRecorder2, "book_102");

assert.strictEqual(res2.success, true, "Result must be true for authenticated user");
assert.strictEqual(apiRecorder2.called, true, "CRITICAL: /api/cart was called as expected for logged-in user");
assert.strictEqual(apiRecorder2.productId, "book_102");
assert.strictEqual(eventDispatched, null, "Modal was NOT opened for logged-in user");
console.log("✓ PASS: Logged-in user added to cart without any popup trigger");

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
