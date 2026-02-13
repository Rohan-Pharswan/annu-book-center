import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();
  const user = await User.findById(auth.user._id).populate("wishlist");
  const discounts = await Discount.find({ active: true }).lean();
  const wishlist = user.wishlist.map((product) => {
    const item = product.toObject ? product.toObject() : product;
    return {
      ...item,
      ...calculateDiscountedPrice(item.price, getBestDiscountForProduct(item, discounts))
    };
  });

  return NextResponse.json({ wishlist });
}
