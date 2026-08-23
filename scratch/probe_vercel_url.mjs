const candidates = [
  "https://annu-book-center.vercel.app",
  "https://annu-book-store.vercel.app",
  "https://annu-book-center-rohan-pharswan.vercel.app"
];

for (const url of candidates) {
  try {
    const res = await fetch(`${url}/api/products?page=1&limit=8`, { method: "HEAD" });
    console.log(`Probe ${url} -> Status: ${res.status}, x-vercel-id: ${res.headers.get("x-vercel-id")}`);
  } catch (err) {
    console.log(`Probe ${url} -> Error: ${err.message}`);
  }
}
