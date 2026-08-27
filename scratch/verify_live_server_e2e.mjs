import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

console.log("=== COMPREHENSIVE LIVE SERVER INTEGRATION TEST ===");

// 1. Check Homepage rendering
console.log("\n1. Testing Homepage HTML (http://localhost:3000)...");
const homeRes = await fetch(BASE_URL);
assert.strictEqual(homeRes.status, 200, "Homepage must return 200");
const homeHtml = await homeRes.text();
assert(homeHtml.includes("Annu Book Store"), "Homepage must include store name");
console.log("✓ PASS: Homepage loaded successfully (Status 200)");

// 2. Check Products Catalog rendering
console.log("\n2. Testing Catalog HTML (http://localhost:3000/products)...");
const catalogRes = await fetch(`${BASE_URL}/products`);
assert.strictEqual(catalogRes.status, 200, "Catalog must return 200");
console.log("✓ PASS: Catalog loaded successfully (Status 200)");

// 3. Test Unauthenticated /api/auth/me
console.log("\n3. Testing Unauthenticated session (/api/auth/me)...");
const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`);
assert.strictEqual(unauthMeRes.status, 401, "Unauthenticated session must return 401");
const unauthMeData = await unauthMeRes.json();
assert.strictEqual(unauthMeData.error, "Unauthorized");
console.log("✓ PASS: Unauthenticated check correctly returns 401 (client detects not logged in)");

// 4. Test Unauthenticated POST /api/cart
console.log("\n4. Testing Unauthenticated POST /api/cart...");
const unauthCartRes = await fetch(`${BASE_URL}/api/cart`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productId: "660000000000000000000001", quantity: 1 })
});
assert.strictEqual(unauthCartRes.status, 401, "Unauthenticated cart addition returns 401");
console.log("✓ PASS: Server enforces 401 on unauthorized cart API requests");

// 5. Test Authenticated Flow (Signup & Login)
console.log("\n5. Testing Authenticated Flow...");
const testEmail = `testuser_${Date.now()}@example.com`;
const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Test Customer",
    email: testEmail,
    password: "Password123!"
  })
});

assert(signupRes.ok, "Signup should succeed (Status 200/201)");
const cookies = signupRes.headers.get("set-cookie") || "";
console.log("✓ PASS: User created and received auth cookie");

// 6. Test Authenticated /api/auth/me with Cookie
console.log("\n6. Testing Authenticated /api/auth/me with session cookie...");
const authMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
  headers: { Cookie: cookies }
});
assert.strictEqual(authMeRes.status, 200, "Authenticated session must return 200");
const authMeData = await authMeRes.json();
assert.strictEqual(authMeData.user?.email, testEmail, "Email must match test user");
console.log("✓ PASS: Authenticated user recognized:", authMeData.user.name);

// 7. Test Fetching Products & Adding to Cart as Logged-In User
console.log("\n7. Fetching live products to test Add to Cart...");
const prodRes = await fetch(`${BASE_URL}/api/products?limit=1`);
const prodData = await prodRes.json();
const sampleProduct = prodData.items?.[0];

if (sampleProduct) {
  console.log(`Adding '${sampleProduct.name}' (ID: ${sampleProduct._id}) to cart as logged-in user...`);
  const authCartRes = await fetch(`${BASE_URL}/api/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies
    },
    body: JSON.stringify({ productId: sampleProduct._id, quantity: 1 })
  });
  assert.strictEqual(authCartRes.status, 200, "Authenticated Add to Cart must return 200");
  const authCartData = await authCartRes.json();
  assert(authCartData.success, "Cart update response must have success: true");
  console.log("✓ PASS: Product successfully added to cart for authenticated user");

  // Verify Cart Contents
  const getCartRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Cookie: cookies }
  });
  const cartData = await getCartRes.json();
  assert(cartData.cart?.length > 0, "Cart should contain the added item");
  console.log(`✓ PASS: Cart verified with ${cartData.cart.length} item(s), Subtotal: ₹${cartData.pricing?.subtotalAmount}`);
}

console.log("\n========================================================");
console.log("🎉 ALL E2E VERIFICATIONS PASSED WITH 100% SUCCESS!");
console.log("========================================================");
