const baseUrl = "https://annu-book-center.vercel.app";

async function probe() {
  const res = await fetch(`${baseUrl}/api/products?page=1&limit=10`);
  const data = await res.json();
  const items = data.items || [];
  console.log(`Found ${items.length} products.`);

  for (const p of items.slice(0, 5)) {
    console.log(`\nTesting product details API for: ${p.name} (ID: ${p._id})`);
    const detailRes = await fetch(`${baseUrl}/api/products/${p._id}`);
    console.log(`Status: ${detailRes.status}`);
    const detailData = await detailRes.json();
    console.log("Detail keys:", Object.keys(detailData));
    console.log("Sample detail fields:", {
      _id: detailData._id,
      name: detailData.name,
      category: detailData.category,
      price: detailData.price,
      finalPrice: detailData.finalPrice,
      rating: detailData.rating,
      ratingCount: detailData.ratingCount,
      reviewsCount: detailData.reviews?.length,
      reviews: detailData.reviews
    });
  }
}

probe().catch(console.error);
