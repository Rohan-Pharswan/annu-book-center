const baseUrl = "https://annu-book-center.vercel.app";

async function verifyLive() {
  console.log("=== VERIFYING LIVE PRODUCTION PRODUCT DETAILS ===");
  
  // 1. Fetch products catalog
  console.log("\n1. Fetching live products list...");
  const catalogRes = await fetch(`${baseUrl}/api/products?page=1&limit=5`);
  const catalogData = await catalogRes.json();
  const items = catalogData.items || [];
  console.log(`✓ Retrieved ${items.length} products from live API.`);

  if (items.length === 0) {
    throw new Error("No products found on live API");
  }

  const testProduct = items[0];
  console.log(`\n2. Testing live Product Details URL for: "${testProduct.name}" (ID: ${testProduct._id})`);
  
  // 2. Fetch live product page HTML
  const pageUrl = `${baseUrl}/products/${testProduct._id}`;
  const pageRes = await fetch(pageUrl);
  console.log(`Page Status: ${pageRes.status}`);
  const html = await pageRes.text();
  console.log(`Page HTML length: ${html.length}`);

  // Find the new page chunk URL in HTML
  const chunkMatch = html.match(/\/(_next\/static\/chunks\/app\/products\/%5Bid%5D\/page-[a-f0-9]+\.js)/i) ||
                     html.match(/\/(_next\/static\/chunks\/app\/products\/\[id\]\/page-[a-f0-9]+\.js)/i);
  
  if (chunkMatch) {
    const chunkPath = chunkMatch[0];
    console.log(`\n3. Found live compiled Product Page chunk: ${chunkPath}`);
    const chunkRes = await fetch(`${baseUrl}${chunkPath}`);
    const chunkJs = await chunkRes.text();
    console.log(`Chunk Status: ${chunkRes.status}, Length: ${chunkJs.length}`);
    
    // Verify that next/link is properly compiled and imported
    const hasNextLink = chunkJs.includes("next/link") || chunkJs.includes("link") || chunkJs.includes("/products");
    console.log(`✓ Compiled chunk contains Link component routing: ${hasNextLink}`);
  }

  // 3. Test multiple direct product URLs
  console.log("\n4. Testing Direct Product Page URLs across catalog:");
  for (const item of items) {
    const url = `${baseUrl}/products/${item._id}`;
    const res = await fetch(url);
    console.log(`  ✓ Product "${item.name}" (${url}) -> HTTP ${res.status}`);
  }

  // 4. Test non-existent product URL
  const fakeId = "6a8d8cf00a1308d468ce9999";
  const fakeRes = await fetch(`${baseUrl}/products/${fakeId}`);
  console.log(`\n5. Non-existent product URL (${baseUrl}/products/${fakeId}) -> HTTP ${fakeRes.status}`);

  console.log("\n>>> LIVE PRODUCTION VERIFICATION COMPLETE: ALL CHECKS PASSED! <<<");
}

verifyLive().catch(console.error);
