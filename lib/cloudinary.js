import { v2 as cloudinary } from "cloudinary";

const enabled =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (enabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export async function uploadImage(dataUri) {
  if (!enabled) {
    return { secureUrl: dataUri, provider: "local" };
  }
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "annu-book-store/products"
  });
  return { secureUrl: uploaded.secure_url, provider: "cloudinary" };
}

