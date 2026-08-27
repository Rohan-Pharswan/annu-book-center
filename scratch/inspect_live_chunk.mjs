const baseUrl = "https://annu-book-center.vercel.app";

async function inspectChunk() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/app/products/%5Bid%5D/page-9e80f560b6546272.js`);
  const js = await res.text();
  const idx = js.indexOf("Annu Book Store");
  console.log("Snippet before and after:", js.slice(Math.max(0, idx - 100), idx + 100));
}

inspectChunk().catch(console.error);
