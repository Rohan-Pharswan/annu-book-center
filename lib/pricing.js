import Discount from "@/models/Discount";

export async function getProductDiscount(product) {
  const active = await Discount.find({
    active: true,
    $or: [
      { scopeType: "product", productId: product._id },
      { scopeType: "category", category: product.category }
    ]
  })
    .sort({ percentage: -1 })
    .lean();

  return active[0] || null;
}

export function applyPercentage(price, percentage) {
  if (!percentage || percentage <= 0) return price;
  return Number((price * (1 - percentage / 100)).toFixed(2));
}

