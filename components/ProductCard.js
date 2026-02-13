"use client";

import Link from "next/link";
import { formatINR } from "@/lib/currency";

export default function ProductCard({ product, onWishlist, onCart }) {
  return (
    <article className="card">
      <img src={product.images?.[0]} alt={product.name} className="card-image" loading="lazy" />
      <div className="card-body">
        <p className="muted">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="price">
          {formatINR(product.finalPrice || product.price)}
          {(product.discountPercentage || 0) > 0 && (
            <span className="strike">{formatINR(product.price)}</span>
          )}
        </p>
        <p className="rating">
          {product.rating || 0} / 5 ({product.ratingCount || 0})
        </p>
        <p className={product.stock > 0 ? "in-stock" : "out-stock"}>
          {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
        </p>
        <div className="card-actions">
          <Link href={`/products/${product._id}`} className="btn">
            Details
          </Link>
          <button className="ghost-btn" onClick={() => onWishlist?.(product._id)}>
            Wishlist
          </button>
          <button className="btn" onClick={() => onCart?.(product._id)} disabled={product.stock <= 0}>
            Add Cart
          </button>
        </div>
      </div>
    </article>
  );
}
