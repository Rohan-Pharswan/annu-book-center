const baseUrl = "https://annu-book-center.vercel.app";

async function testAllLiveEndpoints() {
  console.log("=== LIVE PRODUCTION PERFORMANCE (MUMBAI REGION) ===");

  const endpoints = [
    "/api/products?page=1&limit=8",
    "/api/categories",
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting ${ep} (5 runs)...`);
    const timings = [];
    for (let i = 1; i <= 5; i++) {
      const start = performance.now();
      const res = await fetch(`${baseUrl}${ep}`);
      const duration = performance.now() - start;
      const vercelId = res.headers.get("x-vercel-id");
      timings.push(duration);
      console.log(`  Run ${i}: ${duration.toFixed(2)} ms | Status ${res.status} | Vercel: ${vercelId}`);
      await new Promise(r => setTimeout(r, 200));
    }
    const warm = timings.slice(1);
    const avgWarm = warm.reduce((a, b) => a + b, 0) / warm.length;
    console.log(`  -> Average Warm Latency: ${avgWarm.toFixed(2)} ms (Best: ${Math.min(...warm).toFixed(2)} ms)`);
  }
}

testAllLiveEndpoints().catch(console.error);
