import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { checkRateLimit } from "@/lib/rateLimit";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, DEFAULT_DELIVERY_CHARGE, getBestDiscountForProduct } from "@/lib/pricing";
import Notification from "@/models/Notification";
import { sendAdminWhatsAppOrderNotification } from "@/lib/whatsapp";
import { sendCustomerOrderConfirmationEmail } from "@/lib/email";

// Per-user checkout lock: prevents the same user from placing two concurrent orders.
// Set holds string userIds that are currently mid-checkout.
const checkoutInFlight = new Set();


export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  await connectDB();
  const orders = await Order.find({ userId: auth.user._id })
    .populate("userId", "name email phone")
    .sort({ createdAt: -1 });
  return NextResponse.json({ orders });
});

export const POST = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  // Server-side idempotency: reject concurrent checkout from the same user
  const userId = String(auth.user._id);
  if (checkoutInFlight.has(userId)) {
    return NextResponse.json({ error: "A checkout is already in progress. Please wait." }, { status: 409 });
  }

  // Rate limit: max 5 orders per minute per user (prevents rapid re-submit after retries)
  const rate = checkRateLimit(`checkout:${userId}`, 5, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many order requests. Please wait a moment." }, { status: 429 });
  }

  checkoutInFlight.add(userId);
  try {
    const body = await request.json();
    const fulfillmentType = body.fulfillmentType === "store_visit" ? "store_visit" : "doorstep";

    await connectDB();
    const user = await User.findById(auth.user._id).populate("cart.product");
    if (!user.cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

    let address = null;
    let storeVisit = null;
    let customerPhone = user.phone || "";

    if (fulfillmentType === "doorstep") {
      if (!body.addressId) {
        return NextResponse.json({ error: "Please select a delivery address for doorstep delivery" }, { status: 400 });
      }
      address = user.addresses.id(body.addressId);
      if (!address) return NextResponse.json({ error: "Invalid delivery address" }, { status: 400 });
      customerPhone = address.phone || customerPhone;
    } else {
      // Store visit
      const visitDate = (body.visitDate || "").trim();
      if (!visitDate) {
        return NextResponse.json({ error: "Please select a preferred date for your store visit" }, { status: 400 });
      }
      const visitTime = (body.visitTime || "During Store Hours (10:00 AM - 8:00 PM)").trim();
      storeVisit = {
        visitDate,
        visitTime,
        storeLocation: "Annu Book Center, Dehradun"
      };
      if (body.customerPhone) {
        customerPhone = String(body.customerPhone).trim();
      } else if (body.addressId) {
        const addr = user.addresses.id(body.addressId);
        if (addr?.phone) customerPhone = addr.phone;
      }
    }

    const discounts = await Discount.find({ active: true });
    let subtotalAmount = 0;
    let discountedSubtotal = 0;
    let totalSavings = 0;
    const items = [];
    const updatedProducts = [];

    for (const cartItem of user.cart) {
      const productId = cartItem.product?._id || cartItem.product;
      const product = await Product.findById(productId);
      const productName = product?.name || cartItem.product?.name || "a product";
      if (!product) {
        return NextResponse.json({ error: `Product no longer available: ${productName}` }, { status: 400 });
      }

      const quantity = Number(cartItem.quantity || 1);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: `Invalid quantity for ${productName}` }, { status: 400 });
      }

      const discount = getBestDiscountForProduct(product, discounts);
      const pricing = calculateDiscountedPrice(product.price, discount);
      const unitPrice = pricing.finalPrice;
      const lineTotal = unitPrice * quantity;
      const lineOriginal = pricing.originalPrice * quantity;
      const lineSavings = pricing.savings * quantity;

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
        quantity
      });

      // Atomic stock check-and-decrement: safe for concurrent customer purchases
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updated) {
        // Roll back stock deductions for items already processed in this loop
        for (const rollback of updatedProducts) {
          await Product.findByIdAndUpdate(rollback.productId, { $inc: { stock: rollback.quantity } });
        }
        return NextResponse.json({ error: `Insufficient stock for ${productName}` }, { status: 400 });
      }

      updatedProducts.push({ productId: product._id, quantity });
    }

    const deliveryCharge = 0;
    const deliveryChargeStatus = fulfillmentType === "store_visit" ? "not_required" : "pending";
    const totalAmount = Number((discountedSubtotal + deliveryCharge).toFixed(2));

    const order = await Order.create({
      userId: auth.user._id,
      items,
      fulfillmentType,
      storeVisit,
      subtotalAmount: Number(subtotalAmount.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      deliveryCharge,
      deliveryChargeStatus,
      totalAmount,
      address: address ? address.toObject() : undefined,
      customerName: user.name || auth.user.name || "Customer",
      customerEmail: user.email || "",
      customerPhone: customerPhone || "",
      emailVerifiedByAdmin: false,
      phoneVerifiedByAdmin: false,
      status: "Pending",
      paymentMethod: fulfillmentType === "store_visit" ? "Pay at Store" : "Cash on Delivery"
    });

    user.cart = [];
    await user.save({ validateModifiedOnly: true });

    if (fulfillmentType === "doorstep") {
      await Notification.create({
        type: "home_delivery_request",
        title: "🏠 Home Delivery Request — Action Required",
        message: `${user.name || "Customer"} (${customerPhone || "No Phone"}) requested Home Delivery for order #${String(order._id).slice(-6)} (Book Subtotal: ₹${discountedSubtotal.toFixed(2)}). Contact customer to confirm delivery charge.`,
        meta: {
          orderId: order._id,
          userId: user._id,
          customerName: user.name || "Customer",
          customerPhone: customerPhone || "",
          customerEmail: user.email || "",
          fulfillmentType: "doorstep",
          deliveryChargeStatus: "pending",
          deliveryAddress: address ? address.toObject() : null,
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          subtotalAmount: Number(discountedSubtotal.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2))
        }
      });
    } else {
      await Notification.create({
        type: "store_visit_reservation",
        title: "🏬 Store Visit Reservation Placed",
        message: `${user.name || "Customer"} reserved books for Store Visit on ${storeVisit?.visitDate || "Scheduled Date"} (Order #${String(order._id).slice(-6)} - ₹${totalAmount.toFixed(2)})`,
        meta: {
          orderId: order._id,
          userId: user._id,
          customerName: user.name || "Customer",
          customerPhone: customerPhone || "",
          customerEmail: user.email || "",
          fulfillmentType: "store_visit",
          storeVisit,
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          totalAmount
        }
      });
    }

    // Safely trigger automated WhatsApp notification to admin (failures never break checkout)
    try {
      await sendAdminWhatsAppOrderNotification(order);
    } catch (waErr) {
      console.error("[Order Creation] Error triggering WhatsApp admin notification:", waErr?.message || waErr);
    }

    // Safely trigger automated customer order confirmation email (failures never break checkout)
    try {
      await sendCustomerOrderConfirmationEmail(order);
    } catch (emailErr) {
      console.error("[Order Creation] Error triggering customer confirmation email:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } finally {
    // Always release the lock, even if an exception was thrown
    checkoutInFlight.delete(userId);
  }
});

