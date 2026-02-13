import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, DEFAULT_DELIVERY_CHARGE, getBestDiscountForProduct } from "@/lib/pricing";
import Notification from "@/models/Notification";

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
  let subtotalAmount = 0;
  let discountedSubtotal = 0;
  let totalSavings = 0;
  const items = [];

  for (const cartItem of user.cart) {
    const product = await Product.findById(cartItem.product._id);
    if (!product || product.stock < cartItem.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${cartItem.product.name}` }, { status: 400 });
    }

    const discount = getBestDiscountForProduct(product, discounts);
    const pricing = calculateDiscountedPrice(product.price, discount);
    const unitPrice = pricing.finalPrice;
    const lineTotal = unitPrice * cartItem.quantity;
    const lineOriginal = pricing.originalPrice * cartItem.quantity;
    const lineSavings = pricing.savings * cartItem.quantity;

    subtotalAmount += lineOriginal;
    discountedSubtotal += lineTotal;
    totalSavings += lineSavings;

    items.push({
      productId: product._id,
      name: product.name,
      image: product.images[0],
      originalPrice: pricing.originalPrice,
      price: unitPrice,
      savingsPerUnit: pricing.savings,
      quantity: cartItem.quantity
    });
    product.stock -= cartItem.quantity;
    await product.save();
  }

  const deliveryCharge = DEFAULT_DELIVERY_CHARGE;
  const totalAmount = Number((discountedSubtotal + deliveryCharge).toFixed(2));

  const order = await Order.create({
    userId: auth.user._id,
    items,
    subtotalAmount: Number(subtotalAmount.toFixed(2)),
    totalSavings: Number(totalSavings.toFixed(2)),
    deliveryCharge,
    totalAmount,
    address,
    customerEmail: user.email || "",
    customerPhone: address.phone || "",
    emailVerifiedByAdmin: false,
    phoneVerifiedByAdmin: false,
    status: "Pending",
    paymentMethod: "Cash on Delivery"
  });

  user.cart = [];
  await user.save();
  await Notification.create({
    type: "order_placed",
    title: "New order placed",
    message: `${user.name || "Customer"} placed order #${String(order._id).slice(-6)} for \u20B9${totalAmount.toFixed(2)}`,
    meta: {
      orderId: order._id,
      userId: user._id,
      status: order.status,
      totalAmount
    }
  });

  return NextResponse.json({ success: true, order }, { status: 201 });
});
