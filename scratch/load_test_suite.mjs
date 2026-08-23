import { performance } from "perf_hooks";

const BASE_URL = "https://annu-book-center.vercel.app";
const ENDPOINTS = [
  { name: "products", path: "/api/products?page=1&limit=8" },
  { name: "categories", path: "/api/categories" }
];

function calculatePercentile(sortedArray, p) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

async function runLoadTier({ concurrency, durationSeconds }) {
  console.log(`\n===============================================================`);
  console.log(`STARTING LOAD TEST: ${concurrency} CONCURRENT USERS FOR ${durationSeconds} SECONDS`);
  console.log(`Targeting: ${BASE_URL}`);
  console.log(`Endpoints: 1) /api/products?page=1&limit=8  2) /api/categories`);
  console.log(`===============================================================\n`);

  const startTime = performance.now();
  const endTime = startTime + durationSeconds * 1000;

  const latencies = [];
  const endpointLatencies = {
    products: [],
    categories: []
  };
  const statusCounts = {};
  let totalErrors = 0;
  let totalRequests = 0;

  async function worker(workerId) {
    let reqIndex = workerId;
    while (performance.now() < endTime) {
      const target = ENDPOINTS[reqIndex % ENDPOINTS.length];
      reqIndex++;

      const reqStart = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${target.path}`, {
          method: "GET",
          headers: {
            "User-Agent": "AnnuBookStore-LoadTest/1.0",
            "Accept": "application/json"
          }
        });
        const duration = performance.now() - reqStart;
        const status = res.status;

        // Consume response body to ensure complete transfer
        await res.text();

        latencies.push(duration);
        endpointLatencies[target.name].push(duration);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        totalRequests++;

        if (!res.ok) {
          totalErrors++;
        }
      } catch (err) {
        const duration = performance.now() - reqStart;
        latencies.push(duration);
        endpointLatencies[target.name].push(duration);
        const errKey = `ERR_${err.code || err.name || "Network"}`;
        statusCounts[errKey] = (statusCounts[errKey] || 0) + 1;
        totalErrors++;
        totalRequests++;
      }
    }
  }

  // Spawn concurrent virtual users
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(i));
  }

  // Progress ticker
  const interval = setInterval(() => {
    const elapsed = Math.round((performance.now() - startTime) / 1000);
    const rps = (totalRequests / Math.max(elapsed, 1)).toFixed(1);
    process.stdout.write(`  [${elapsed}s / ${durationSeconds}s] Requests: ${totalRequests} | Current RPS: ${rps} | Errors: ${totalErrors}\r`);
  }, 2000);

  await Promise.all(workers);
  clearInterval(interval);

  const actualDurationMs = performance.now() - startTime;
  const actualDurationSec = actualDurationMs / 1000;

  latencies.sort((a, b) => a - b);
  endpointLatencies.products.sort((a, b) => a - b);
  endpointLatencies.categories.sort((a, b) => a - b);

  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p50 = calculatePercentile(latencies, 50);
  const p90 = calculatePercentile(latencies, 90);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const rps = totalRequests / actualDurationSec;
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  const result = {
    concurrency,
    durationSeconds: actualDurationSec.toFixed(2),
    totalRequests,
    rps: rps.toFixed(2),
    min: min.toFixed(2),
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p90: p90.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    max: max.toFixed(2),
    totalErrors,
    errorRate: `${errorRate.toFixed(2)}%`,
    statusDistribution: statusCounts,
    endpointBreakdown: {
      products: {
        count: endpointLatencies.products.length,
        avg: (endpointLatencies.products.reduce((a, b) => a + b, 0) / Math.max(endpointLatencies.products.length, 1)).toFixed(2),
        p50: calculatePercentile(endpointLatencies.products, 50).toFixed(2),
        p95: calculatePercentile(endpointLatencies.products, 95).toFixed(2),
        p99: calculatePercentile(endpointLatencies.products, 99).toFixed(2)
      },
      categories: {
        count: endpointLatencies.categories.length,
        avg: (endpointLatencies.categories.reduce((a, b) => a + b, 0) / Math.max(endpointLatencies.categories.length, 1)).toFixed(2),
        p50: calculatePercentile(endpointLatencies.categories, 50).toFixed(2),
        p95: calculatePercentile(endpointLatencies.categories, 95).toFixed(2),
        p99: calculatePercentile(endpointLatencies.categories, 99).toFixed(2)
      }
    }
  };

  console.log(`\n\n------------------- RESULTS: ${concurrency} USERS -------------------`);
  console.log(`Total Requests       : ${result.totalRequests}`);
  console.log(`Requests per Second  : ${result.rps} req/s`);
  console.log(`Average Latency      : ${result.avg} ms`);
  console.log(`Median (p50) Latency : ${result.p50} ms`);
  console.log(`p90 Latency          : ${result.p90} ms`);
  console.log(`p95 Latency          : ${result.p95} ms`);
  console.log(`p99 Latency          : ${result.p99} ms`);
  console.log(`Min Latency          : ${result.min} ms`);
  console.log(`Max Latency          : ${result.max} ms`);
  console.log(`Error Rate           : ${result.errorRate} (${result.totalErrors} errors)`);
  console.log(`Status Distribution  :`, JSON.stringify(result.statusDistribution));
  console.log(`Endpoint Breakdown   :`, JSON.stringify(result.endpointBreakdown, null, 2));
  console.log(`----------------------------------------------------------\n`);

  return result;
}

// Check command line arg or run progressive suite
const targetTier = process.argv[2];

if (targetTier === "10") {
  await runLoadTier({ concurrency: 10, durationSeconds: 30 });
} else if (targetTier === "50") {
  await runLoadTier({ concurrency: 50, durationSeconds: 30 });
} else if (targetTier === "100") {
  await runLoadTier({ concurrency: 100, durationSeconds: 60 });
} else {
  console.log("Usage: node load_test_suite.mjs [10|50|100]");
}
