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

const productsWithReviews = await mongoose.connection.collection("products").find({
  $or: [{ rating: { $gt: 0 } }, { ratingCount: { $gt: 0 } }]
}).toArray();

console.log("Products with rating > 0:", productsWithReviews.length);
productsWithReviews.forEach(p => {
  console.log(`Product: "${p.name}" (ID: ${p._id}), rating: ${p.rating}, ratingCount: ${p.ratingCount}`);
});

await mongoose.disconnect();
