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

const products = await mongoose.connection.collection("products").find({}, { projection: { name: 1, category: 1, price: 1 } }).toArray();
console.log("PRODUCTS COUNT:", products.length);
products.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p._id}] "${p.name}" | Cat: ${p.category} | Rs.${p.price}`);
});

await mongoose.disconnect();
