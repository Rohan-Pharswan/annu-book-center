"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/currency";

export default function ProductCard({ product, onWishlist, onCart }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "";
  const hasDiscount = Number(product.savings || 0) > 0;

  return (
    <article className="card">
      <div className="card-image-wrap">
        {!imageError && imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="card-image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="card-image" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#94a3b8" }}>
            📚
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="row between" style={{ marginBottom: "4px" }}>
          <span className="muted" style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            {product.category}
          </span>
          {hasDiscount && (
            <span className="discount-badge">
              {product.discountLabel || `Save ${formatINR(product.savings)}`}
            </span>
          )}
        </div>

        <h3>
          <Link href={`/products/${product._id}`} style={{ color: "inherit" }}>
            {product.name}
          </Link>
        </h3>

        <div className="price">
          <span>{formatINR(product.finalPrice || product.price)}</span>
          {hasDiscount && (
            <span className="strike">{formatINR(product.originalPrice || product.price)}</span>
          )}
        </div>

        <div className="row between" style={{ margin: "4px 0 10px" }}>
          <span className="rating" aria-label={`Rating ${product.rating || 0} out of 5 stars from ${product.ratingCount || 0} reviews`}>
            ★ {product.rating ? Number(product.rating).toFixed(1) : "0.0"} <span className="muted">({product.ratingCount || 0})</span>
          </span>
          <span className={product.stock > 0 ? "in-stock" : "out-stock"}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>

        <div className="card-actions">
          <Link href={`/products/${product._id}`} className="btn-secondary" aria-label={`View details for ${product.name}`}>
            Details
          </Link>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onWishlist?.(product._id)}
            aria-label={`Add ${product.name} to wishlist`}
          >
            ♡ Wishlist
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onCart?.(product._id)}
            disabled={product.stock <= 0}
            aria-label={product.stock > 0 ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
          >
            {product.stock > 0 ? "+ Cart" : "Sold Out"}
          </button>
        </div>
      </div>
    </article>
  );
}

