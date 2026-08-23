import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured() {
  return (
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET)
  );
}

function ensureConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables."
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Uploads an image (data URI or remote URL) to Cloudinary with automatic WebP/AVIF format and compression.
 * @param {string} image - Base64 data URI or image URL to upload.
 * @param {object} [options] - Optional custom upload settings.
 * @returns {Promise<{ secureUrl: string, publicId: string, provider: string }>}
 */
export async function uploadImage(image, options = {}) {
  ensureConfigured();

  if (!image || typeof image !== "string") {
    throw new Error("Invalid image input provided for upload.");
  }

  const result = await cloudinary.uploader.upload(image, {
    folder: "annu-book-store/products",
    resource_type: "image",
    transformation: [
      {
        quality: "auto:good",
        fetch_format: "auto",
        flags: "lossy"
      }
    ],
    ...options
  });

  if (!result || !result.secure_url) {
    throw new Error("Cloudinary upload failed: No secure URL returned.");
  }

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    provider: "cloudinary"
  };
}


