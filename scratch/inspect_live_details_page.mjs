const baseUrl = "https://annu-book-center.vercel.app";

async function check() {
  const prodId = "6a8d8cf00a1308d468ce35b2";
  const pageUrl = `${baseUrl}/products/${prodId}`;
  console.log(`Fetching HTML from: ${pageUrl}`);
  const res = await fetch(pageUrl);
  console.log(`Status: ${res.status}`);
  const html = await res.text();
  console.log(`HTML Length: ${html.length}`);
  console.log("Snippet:", html.slice(0, 1000));
}

check().catch(console.error);
