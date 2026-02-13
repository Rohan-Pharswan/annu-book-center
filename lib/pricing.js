import Discount from "@/models/Discount";

export const DEFAULT_DELIVERY_CHARGE = 100;

function normalizeDiscount(discount) {
  if (!discount) return { discountType: "percentage", discountValue: 0 };

  const discountType = discount.discountType === "flat" ? "flat" : "percentage";
  const rawValue =
    discountType === "flat"
      ? Number(discount.value || 0)
      : Number(discount.percentage || discount.value || 0);

  return {
    discountType,
    discountValue: Number.isFinite(rawValue) ? rawValue : 0
  };
}

export function calculateDiscountedPrice(price, discount) {
  const originalPrice = Number(price || 0);
  const { discountType, discountValue } = normalizeDiscount(discount);

  let finalPrice = originalPrice;
  if (discountType === "flat") {
    finalPrice = Math.max(0, originalPrice - Math.max(0, discountValue));
  } else if (discountValue > 0) {
    const percentage = Math.min(90, Math.max(0, discountValue));
    finalPrice = originalPrice * (1 - percentage / 100);
  }

  finalPrice = Number(finalPrice.toFixed(2));
  const savings = Number((originalPrice - finalPrice).toFixed(2));
  const discountLabel =
    savings <= 0 ? "" : discountType === "flat" ? `\u20B9${discountValue} off` : `${discountValue}% off`;

  return {
    originalPrice,
    finalPrice,
    savings,
    discountType,
    discountValue,
    discountLabel
  };
}

export function getBestDiscountForProduct(product, discounts = []) {
  if (!product) return null;
  const productCategory = String(product.category || "").trim().toLowerCase();

  const applicable = discounts.filter(
    (d) =>
      d?.active &&
      ((d.scopeType === "product" && String(d.productId) === String(product._id)) ||
        (d.scopeType === "category" && String(d.category || "").trim().toLowerCase() === productCategory))
  );

  if (!applicable.length) return null;

  return applicable.reduce((best, current) => {
    if (!best) return current;
    const currentSavings = calculateDiscountedPrice(product.price, current).savings;
    const bestSavings = calculateDiscountedPrice(product.price, best).savings;
    return currentSavings > bestSavings ? current : best;
  }, null);
}

export async function getProductDiscount(product) {
  const active = await Discount.find({
    active: true,
    $or: [
      { scopeType: "product", productId: product._id },
      { scopeType: "category", category: product.category }
    ]
  })
    .lean();

  return getBestDiscountForProduct(product, active);
}

export function applyPercentage(price, percentage) {
  if (!percentage || percentage <= 0) return price;
  return Number((price * (1 - percentage / 100)).toFixed(2));
}
