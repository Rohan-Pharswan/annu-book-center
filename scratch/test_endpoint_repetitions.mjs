import mongoose from "mongoose";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

const baseUrl = "http://localhost:3000";

async function testEndpointRepetitions() {
  console.log("=== REPEATED ENDPOINT LATENCY MEASUREMENTS (5 RUNS) ===");

  const endpoints = [
    "/api/categories",
    "/api/products?q=&category=&page=1&limit=12",
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting endpoint: ${ep}`);
    const times = [];
    for (let i = 1; i <= 5; i++) {
      const start = performance.now();
      const res = await fetch(`${baseUrl}${ep}`);
      const duration = performance.now() - start;
      const text = await res.text();
      times.push(duration);
      console.log(`  Run ${i}: ${duration.toFixed(2)} ms (HTTP ${res.status}, ${text.length} bytes)`);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  -> Average Latency: ${avg.toFixed(2)} ms (Min: ${Math.min(...times).toFixed(2)} ms, Max: ${Math.max(...times).toFixed(2)} ms)`);
  }
}

testEndpointRepetitions().catch(console.error);
