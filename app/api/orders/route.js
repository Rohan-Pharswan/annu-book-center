import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Discount from "@/models/Discount";
import { applyPercentage } from "@/lib/pricing";

export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  await connectDB();
  const orders = await Order.find({ userId: auth.user._id }).sort({ createdAt: -1 });
  return NextResponse.json({ orders });
});

export const POST = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { addressId } = await request.json();

  await connectDB();
  const user = await User.findById(auth.user._id).populate("cart.product");
  if (!user.cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const address = user.addresses.id(addressId);
  if (!address) return NextResponse.json({ error: "Invalid address" }, { status: 400 });

  const discounts = await Discount.find({ active: true });
  let totalAmount = 0;
  const items = [];

  for (const cartItem of user.cart) {
    const product = await Product.findById(cartItem.product._id);
    if (!product || product.stock < cartItem.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${cartItem.product.name}` }, { status: 400 });
    }

    const discount = discounts.find(
      (d) =>
        (d.scopeType === "product" && String(d.productId) === String(product._id)) ||
        (d.scopeType === "category" && d.category === product.category)
    );
    const unitPrice = applyPercentage(product.price, discount?.percentage || 0);
    const lineTotal = unitPrice * cartItem.quantity;
    totalAmount += lineTotal;

    items.push({
      productId: product._id,
      name: product.name,
      image: product.images[0],
      price: unitPrice,
      quantity: cartItem.quantity
    });
    product.stock -= cartItem.quantity;
    await product.save();
  }

  const order = await Order.create({
    userId: auth.user._id,
    items,
    totalAmount,
    address,
    status: "Pending",
    paymentMethod: "Cash on Delivery"
  });

  user.cart = [];
  await user.save();

  return NextResponse.json({ success: true, order }, { status: 201 });
});
