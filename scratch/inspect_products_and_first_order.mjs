import mongoose from "mongoose";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const lines = env.split("\n");
let uri = "";
for (const line of lines) {
  if (line.startsWith("MONGODB_URI=")) {
    uri = line.substring("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
  }
}

await mongoose.connect(uri);

console.log("=== ALL PRODUCTS ===");
const products = await mongoose.connection.collection("products").find({}).toArray();
products.forEach(p => {
  console.log(`Product ID: ${p._id} | Name: "${p.name}" | Category: "${p.category}" | Price: ${p.price}`);
});

console.log("\n=== FIRST ORDER (6a89c957454a687eea037cc5) ===");
const firstOrder = await mongoose.connection.collection("orders").findOne({ _id: new mongoose.Types.ObjectId("6a89c957454a687eea037cc5") });
console.dir(firstOrder, { depth: null });

await mongoose.disconnect();
