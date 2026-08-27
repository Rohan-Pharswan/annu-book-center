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

const discounts = await mongoose.connection.collection("discounts").find({}).toArray();
console.log("Discounts:", discounts);

const categories = await mongoose.connection.collection("categories").find({}).toArray();
console.log("Categories count:", categories.length);

await mongoose.disconnect();
