const url = "https://annu-book-center.vercel.app/api/products?page=1&limit=8";

console.log("=== 10 SEQUENTIAL REQUESTS TO LIVE VERCEL PRODUCTION ===");
console.log(`URL: ${url}\n`);

const timings = [];
const responses = [];

for (let i = 1; i <= 10; i++) {
  const start = performance.now();
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 Performance-Investigation-Agent",
      "Accept": "application/json"
    }
  });
  const duration = performance.now() - start;
  const text = await res.text();
  const bytes = Buffer.byteLength(text, "utf8");
  const vercelId = res.headers.get("x-vercel-id") || "none";
  const vercelCache = res.headers.get("x-vercel-cache") || "none";
  const date = res.headers.get("date");

  timings.push(duration);
  responses.push({
    run: i,
    status: res.status,
    timeMs: duration.toFixed(2),
    bytes,
    vercelId,
    vercelCache
  });

  console.log(`Request #${i.toString().padStart(2, "0")}: ${duration.toFixed(2)} ms | HTTP ${res.status} | Size: ${bytes} B | Vercel ID: ${vercelId}`);
  
  // 300ms pause between requests to simulate human sequential clicks
  await new Promise((r) => setTimeout(r, 300));
}

timings.sort((a, b) => a - b);
const min = timings[0];
const max = timings[timings.length - 1];
const sum = timings.reduce((a, b) => a + b, 0);
const avg = sum / timings.length;
const median = (timings[4] + timings[5]) / 2;

console.log("\n=================== STATISTICAL SUMMARY ===================");
console.log(`Total Requests  : 10`);
console.log(`Min Latency     : ${min.toFixed(2)} ms`);
console.log(`Median Latency  : ${median.toFixed(2)} ms`);
console.log(`Average Latency : ${avg.toFixed(2)} ms`);
console.log(`Max Latency     : ${max.toFixed(2)} ms`);
console.log("===========================================================");
