import mongoose, { Schema } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    originalPrice: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    savingsPerUnit: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const AddressSnapshotSchema = new Schema(
  {
    label: String,
    line1: String,
    city: String,
    state: String,
    postalCode: String,
    phone: String
  },
  { _id: false }
);

const StoreVisitSchema = new Schema(
  {
    visitDate: { type: String, default: "" },
    visitTime: { type: String, default: "" },
    storeLocation: { type: String, default: "Annu Book Center, Dehradun" }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [OrderItemSchema],
    fulfillmentType: {
      type: String,
      enum: ["doorstep", "store_visit"],
      default: "doorstep"
    },
    storeVisit: { type: StoreVisitSchema, default: null },
    subtotalAmount: { type: Number, required: true, min: 0, default: 0 },
    totalSavings: { type: Number, required: true, min: 0, default: 0 },
    deliveryCharge: { type: Number, required: true, min: 0, default: 0 },
    deliveryChargeStatus: {
      type: String,
      enum: ["not_required", "pending", "confirmed"],
      default: "not_required"
    },
    totalAmount: { type: Number, required: true, min: 0 },
    address: { type: AddressSnapshotSchema, required: false },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    emailVerifiedByAdmin: { type: Boolean, default: false },
    phoneVerifiedByAdmin: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Ready for Pickup",
        "Picked Up",
        "Out for Delivery",
        "Delivered",
        "Cancelled"
      ],
      default: "Pending"
    },
    paymentMethod: { type: String, default: "Cash on Delivery" }
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;
