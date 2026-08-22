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
const users = await mongoose.connection.collection("users").find({}).toArray();
console.log("Users in DB:");
console.dir(users, { depth: null });
await mongoose.disconnect();
