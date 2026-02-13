import mongoose, { Schema } from "mongoose";

const DiscountSchema = new Schema(
  {
    scopeType: { type: String, enum: ["product", "category"], required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    category: { type: String },
    discountType: { type: String, enum: ["percentage", "flat"], default: "percentage" },
    percentage: { type: Number, min: 1, max: 90 },
    value: { type: Number, min: 1 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Discount = mongoose.models.Discount || mongoose.model("Discount", DiscountSchema);
export default Discount;
