import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, required: true },
    images: [{ type: String, required: true }],
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    type: { type: String, enum: ["book", "stationery"], default: "book" }
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", description: "text", category: "text" });

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;

