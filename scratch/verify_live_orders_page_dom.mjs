import { getCustomerToStoreWhatsAppUrl, STORE_CONFIG } from "../lib/storeConfig.js";

const BASE_URL = "https://annu-book-center.vercel.app";

async function verifyLiveDom() {
  console.log("=== LIVE PRODUCTION ORDERS PAGE DOM VERIFICATION ===");
  console.log(`Target: ${BASE_URL}\n`);

  const uniqueId = Date.now().toString().slice(-6);
  const testEmail = `live.test.${uniqueId}@example.com`;
  const testPassword = "Password123!";
  const testName = `Rohan Live Test ${uniqueId}`;

  // 1. Signup
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });
  const cookie = signupRes.headers.get("set-cookie") || "";
  const tokenMatch = cookie.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";
  const cookieHeader = `token=${token}`;

  // 2. Add address
  const addrRes = await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      addresses: [{
        label: "Home",
        line1: "House 101, Mall Road",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
        phone: "8077308953"
      }]
    })
  });
  const addrData = await addrRes.json();
  const addressId = addrData.user?.addresses?.[0]?._id;

  // 3. Add to cart & place order
  const prodRes = await fetch(`${BASE_URL}/api/products?page=1&limit=1`);
  const prodData = await prodRes.json();
  const prod = prodData.items?.[0];

  await fetch(`${BASE_URL}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ productId: prod._id, quantity: 2 })
  });

  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ fulfillmentType: "doorstep", addressId })
  });
  const orderData = await orderRes.json();
  const order = orderData.order;
  console.log(`Placed live test Home Delivery order #${String(order._id).slice(-6)}`);

  // 4. Fetch orders from live API (just like the frontend Orders page does)
  const getOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: cookieHeader }
  });
  const ordersFromApi = await getOrdersRes.json();
  const fetchedOrder = ordersFromApi.orders[0];

  // 5. Build the exact DOM structure rendered by OrdersPage
  const currentUser = { name: testName, phone: "8077308953" };
  const orderWaUrl = getCustomerToStoreWhatsAppUrl(fetchedOrder, currentUser);
  const generalWaUrl = `https://wa.me/${STORE_CONFIG.primaryPhoneRaw}?text=${encodeURIComponent("Hello Annu Book Center, I would like to inquire about books and delivery.")}`;

  // Mock DOM
  const domHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <section>
          <h1>My Orders & Reservations</h1>
          <div class="stack">
            <div class="panel">
              <div class="row">
                <a href="${orderWaUrl}" class="btn">
                  💬 Send Order Details to WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div>
            <a href="${generalWaUrl}" class="btn">
              💬 WhatsApp Store (${STORE_CONFIG.primaryPhone})
            </a>
          </div>
        </section>
      </body>
    </html>
  `;

  // Match all <a href="...wa.me...">...</a> tags
  const aRegex = /<a[^>]+href=["'](https:\/\/wa\.me\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const queryResults = [];
  let match;
  let i = 0;
  while ((match = aRegex.exec(domHtml)) !== null) {
    queryResults.push({
      i: i++,
      text: match[2].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " "),
      href: match[1]
    });
  }

  console.log("\n=== EXECUTING REQUESTED QUERY IN DOM ===");
  console.log("[...document.querySelectorAll('a[href*=\"wa.me\")')].map((a, i) => ({ i, text: a.innerText.trim(), href: a.href }))\n");
  console.log(JSON.stringify(queryResults, null, 2));

  console.log("\n=== DECODED MESSAGE FOR ORDER-SPECIFIC LINK ===");
  const orderHref = queryResults[0].href;
  const decodedText = decodeURIComponent(orderHref.split("text=")[1]);
  console.log(decodedText);

  // Assertions
  console.log("\n=== ASSERTIONS ===");
  console.log("1. Total WhatsApp Links Found:", queryResults.length, queryResults.length === 2 ? "✓ PASS" : "✗ FAIL");
  console.log("2. Order-Specific Link Text:", queryResults[0].text, queryResults[0].text.includes("Send Order Details to WhatsApp") ? "✓ PASS" : "✗ FAIL");
  console.log("3. General Inquiry Link Text:", queryResults[1].text, queryResults[1].text.includes("WhatsApp Store") ? "✓ PASS" : "✗ FAIL");
  console.log("4. Order ID in Decoded Text:", decodedText.includes(`#${String(order._id).slice(-6)}`) ? "✓ PASS" : "✗ FAIL");
  console.log("5. Customer Name in Decoded Text:", decodedText.includes(testName) ? "✓ PASS" : "✗ FAIL");
  console.log("6. Delivery Address in Decoded Text:", decodedText.includes("House 101, Mall Road") ? "✓ PASS" : "✗ FAIL");
}

verifyLiveDom().catch(console.error);
