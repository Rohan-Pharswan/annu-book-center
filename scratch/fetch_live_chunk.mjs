const baseUrl = "https://annu-book-center.vercel.app";

async function fetchChunk() {
  const chunkUrl = `${baseUrl}/_next/static/chunks/app/products/%5Bid%5D/page-9dc411e9db94f123.js`;
  console.log(`Fetching chunk: ${chunkUrl}`);
  const res = await fetch(chunkUrl);
  console.log(`Status: ${res.status}`);
  const js = await res.text();
  console.log(`JS Chunk length: ${js.length}`);
  fs.writeFileSync("scratch/live_product_page_chunk.js", js);
  console.log("Saved to scratch/live_product_page_chunk.js");
}

import fs from "fs";
fetchChunk().catch(console.error);
