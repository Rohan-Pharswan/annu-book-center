import Review from "@/models/Review";
import Product from "@/models/Product";

export async function refreshProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 }
      }
    }
  ]);

  const rating = stats[0]?.avgRating || 0;
  const ratingCount = stats[0]?.count || 0;

  await Product.findByIdAndUpdate(productId, {
    rating: Number(rating.toFixed(1)),
    ratingCount
  });
}

