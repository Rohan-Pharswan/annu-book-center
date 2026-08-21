import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";

export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  await connectDB();
  const user = await User.findById(auth.user._id).populate("wishlist");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Filter out any products that have been deleted from the database
  const validProducts = (user.wishlist || []).filter((product) => Boolean(product && product._id));

  // If there were dangling/deleted product references, prune them from user's wishlist in DB
  if (validProducts.length !== (user.wishlist || []).length) {
    user.wishlist = validProducts.map((p) => p._id);
    await user.save();
  }

  const discounts = await Discount.find({ active: true }).lean();
  const wishlist = validProducts.map((product) => {
    const item = product.toObject ? product.toObject() : product;
    return {
      ...item,
      ...calculateDiscountedPrice(item.price || 0, getBestDiscountForProduct(item, discounts))
    };
  });

  return NextResponse.json({ wishlist });
});

