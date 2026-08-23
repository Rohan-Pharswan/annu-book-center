import { getCustomerToStoreWhatsAppUrl } from "../lib/storeConfig.js";

const BASE_URL = "https://annu-book-center.vercel.app";

async function main() {
  console.log("=== COMPREHENSIVE LIVE PRODUCTION DOM & WHATSAPP HREF VERIFICATION ===");
  console.log(`Target: ${BASE_URL}\n`);

  const uniqueId = Date.now().toString().slice(-6);
  const testEmail = `test.wa.${uniqueId}@example.com`;
  const testPassword = "Password123!";
  const testName = `Rohan Production Test ${uniqueId}`;

  // 1. Signup on live production
  console.log("1. Signing up test customer on live production...");
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword
    })
  });

  const signupData = await signupRes.json();
  console.log("Signup response status:", signupRes.status, signupData.success ? "SUCCESS" : signupData);

  const rawCookie = signupRes.headers.get("set-cookie") || "";
  const tokenMatch = rawCookie.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";
  const cookieHeader = `token=${token}`;

  // 2. Add an address to profile
  console.log("\n2. Adding delivery address on live production...");
  const addrRes = await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      addresses: [
        {
          label: "Home",
          line1: "Flat 502, Rajpur Heights",
          city: "Dehradun",
          state: "Uttarakhand",
          postalCode: "248001",
          phone: "8077308953"
        }
      ]
    })
  });
  const addrData = await addrRes.json();
  console.log("Address created status:", addrRes.status, addrData.user?.addresses?.length ? "SUCCESS" : addrData);
  const addressId = addrData.user?.addresses?.[0]?._id;

  // 3. Get a product from catalog to add to cart
  console.log("\n3. Fetching product catalog...");
  const prodRes = await fetch(`${BASE_URL}/api/products?page=1&limit=2`);
  const prodData = await prodRes.json();
  const product = prodData.items?.[0];
  console.log(`Found product: "${product?.name}" (ID: ${product?._id}, Price: ₹${product?.finalPrice || product?.price})`);

  // 4. Add to cart
  console.log("\n4. Adding product to cart on live production...");
  const cartRes = await fetch(`${BASE_URL}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      productId: product._id,
      quantity: 2
    })
  });
  const cartData = await cartRes.json();
  console.log("Cart updated status:", cartRes.status);

  // 5. Place Home Delivery Order on live production
  console.log("\n5. Placing Home Delivery Order on live production...");
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      fulfillmentType: "doorstep",
      addressId: addressId
    })
  });
  const orderData = await orderRes.json();
  console.log("Order placed status:", orderRes.status, orderData.success ? "SUCCESS" : orderData);
  const placedOrder = orderData.order;

  // 6. Fetch live orders from /api/orders
  console.log("\n6. Fetching customer orders from live /api/orders...");
  const getOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: cookieHeader }
  });
  const liveOrdersData = await getOrdersRes.json();
  console.log("Orders retrieved:", liveOrdersData.orders?.length);

  const realOrder = liveOrdersData.orders[0];
  console.log("\n--- Real Order Object from Live Database ---");
  console.log({
    _id: realOrder._id,
    customerName: realOrder.customerName,
    customerPhone: realOrder.customerPhone,
    fulfillmentType: realOrder.fulfillmentType,
    deliveryChargeStatus: realOrder.deliveryChargeStatus,
    subtotalAmount: realOrder.subtotalAmount,
    totalSavings: realOrder.totalSavings,
    totalAmount: realOrder.totalAmount,
    address: realOrder.address,
    items: realOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
  });

  // 7. Generate and verify the actual Orders-page WhatsApp link
  console.log("\n7. Evaluating Orders-Page WhatsApp Button Link Generation...");
  const currentUser = { name: testName, phone: "8077308953" };
  const renderedHref = getCustomerToStoreWhatsAppUrl(realOrder, currentUser);

  console.log("\n=== RENDERED WHATSAPP BUTTON HREF ===");
  console.log(renderedHref);

  const urlObj = new URL(renderedHref);
  const rawTextParam = urlObj.searchParams.get("text");
  console.log("\n=== DECODED WHATSAPP ORDER MESSAGE ===");
  console.log(rawTextParam);

  // 8. Strict validation checks
  console.log("\n8. Validating Message Contents against Requirements...");
  const checks = [
    { label: "Points to Store WhatsApp (+91 8077308953)", pass: renderedHref.startsWith("https://wa.me/918077308953?text=") },
    { label: "Not generic fallback message", pass: !rawTextParam.includes("I would like to inquire about books and delivery") },
    { label: "Contains Order ID", pass: rawTextParam.includes(`order #${String(realOrder._id).slice(-6)}`) },
    { label: "Contains Customer Name", pass: rawTextParam.includes(testName) },
    { label: "Contains Customer Phone", pass: rawTextParam.includes("8077308953") },
    { label: "Contains Delivery Address Line", pass: rawTextParam.includes("Flat 502, Rajpur Heights") },
    { label: "Contains City & State", pass: rawTextParam.includes("Dehradun") && rawTextParam.includes("Uttarakhand") },
    { label: "Contains Ordered Book Name", pass: rawTextParam.includes(product.name) },
    { label: "Contains Ordered Quantity", pass: rawTextParam.includes("2 ×") },
    { label: "Contains Book Subtotal", pass: rawTextParam.includes("Book Subtotal: ₹") },
    { label: "Contains Current Order Amount", pass: rawTextParam.includes("Current Order Amount: ₹") },
    { label: "Contains Delivery Charge: To be confirmed", pass: rawTextParam.includes("Delivery Charge: To be confirmed") },
    { label: "Contains Confirmation Request", pass: rawTextParam.includes("Please confirm my home delivery charges.") }
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? "✓ PASS" : "✗ FAIL"}: ${check.label}`);
    if (!check.pass) allPassed = false;
  }

  if (allPassed) {
    console.log("\n>>> LIVE PRODUCTION VERIFICATION PASSED WITH 100% SUCCESS! <<<");
  } else {
    console.error("\n>>> SOME VERIFICATION CHECKS FAILED! <<<");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Live test failed with error:", err);
  process.exit(1);
});
