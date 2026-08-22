import mongoose from "mongoose";
import { Schema } from "mongoose";

// Define User schema with ref to Product (without defining Product yet)
const CartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1 }
  },
  { _id: false }
);

const UserSchema = new Schema({
  name: String,
  cart: [CartItemSchema],
  wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }]
});

const User = mongoose.models.TestUser || mongoose.model("TestUser", UserSchema);

// Create a query with populate
try {
  const q = User.findOne({}).populate("cart.product");
  // Inspect the populate options
  console.log("Populate options:", q._mongooseOptions.populate);
  // When executed against mongodb without Product model registered:
  // Mongoose throws: MissingSchemaError: Schema hasn't been registered for model "Product".
  console.log("Registered models:", Object.keys(mongoose.models));
  if (!mongoose.models.Product) {
    console.log("CONFIRMED: Product model is NOT registered in mongoose.models!");
  }
} catch (err) {
  console.error("Caught error:", err);
}
