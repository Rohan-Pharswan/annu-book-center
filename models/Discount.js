import mongoose, { Schema } from "mongoose";

const DiscountSchema = new Schema(
  {
    scopeType: { type: String, enum: ["product", "category"], required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    category: { type: String },
    percentage: { type: Number, min: 1, max: 90, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Discount = mongoose.models.Discount || mongoose.model("Discount", DiscountSchema);
export default Discount;

