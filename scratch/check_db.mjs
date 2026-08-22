import mongoose from "mongoose";
import fs from "fs";

try {
  const env = fs.readFileSync(".env.local", "utf8");
  const lines = env.split("\n");
  let uri = "";
  for (const line of lines) {
    if (line.startsWith("MONGODB_URI=")) {
      uri = line.substring("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  if (!uri) {
    console.log("RESULT: MONGODB_URI is empty or missing in .env.local");
  } else {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("RESULT: MongoDB connection SUCCESSFUL!");
    await mongoose.disconnect();
  }
} catch (err) {
  console.error("RESULT: MongoDB connection FAILED ->", err.message);
}
