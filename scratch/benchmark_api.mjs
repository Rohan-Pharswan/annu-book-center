import fs from "fs";

async function runBenchmark() {
  console.log("=== PERFORMANCE BENCHMARK & FUNCTIONALITY TESTING ===");

  const baseUrl = "http://localhost:3000";

  // Test GET /api/products?q=&category=&page=1&limit=8
  const url = `${baseUrl}/api/products?q=&category=&page=1&limit=8`;
  console.log(`\nFetching: ${url}`);

  const start = performance.now();
  const res = await fetch(url);
  const duration = (performance.now() - start).toFixed(2);
  const text = await res.text();
  const bytes = Buffer.byteLength(text, "utf8");
  const data = JSON.parse(text);

  console.log(`Status Code     : ${res.status}`);
  console.log(`Payload Size    : ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB)`);
  console.log(`Response Time   : ${duration} ms`);
  console.log(`Products Count  : ${data.items?.length}`);
  console.log(`Pagination Total: ${data.pagination?.total}`);

  console.log("\nProducts returned:");
  for (const item of data.items || []) {
    console.log(`- [${item._id}] "${item.name}"`);
    console.log(`  Price: ₹${item.price}, FinalPrice: ₹${item.finalPrice}, Stock: ${item.stock}`);
    console.log(`  Images (${item.images?.length}):`, item.images);
    const hasBase64 = item.images?.some((img) => typeof img === "string" && img.startsWith("data:"));
    console.log(`  Contains Base64: ${hasBase64 ? "YES (ERROR!)" : "NO (CLEAN URL)"}`);
  }

  // Test pagination limit = 2
  const pageRes = await fetch(`${baseUrl}/api/products?page=1&limit=2`);
  const pageData = await pageRes.json();
  console.log(`\nPagination check (limit=2): returned ${pageData.items?.length} items (expected 2)`);

  // Test search query
  const searchRes = await fetch(`${baseUrl}/api/products?q=drishti`);
  const searchData = await searchRes.json();
  console.log(`Search check (q=drishti): returned ${searchData.items?.length} items`);

  // Test single product details endpoint
  if (data.items?.[0]?._id) {
    const singleId = data.items[0]._id;
    const singleRes = await fetch(`${baseUrl}/api/products/${singleId}`);
    const singleData = await singleRes.json();
    console.log(`\nSingle Product Detail [${singleId}]: Status ${singleRes.status}, Name: "${singleData.name}", Images: ${singleData.images?.[0]}`);
  }
}

runBenchmark().catch((err) => {
  console.error("Benchmark error:", err.message);
});
