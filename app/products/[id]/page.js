"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const toast = useToast();

  async function loadProduct() {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      const data = await res.json();
      if (!res.ok || data.error || !data._id) {
        setProduct({ notFound: true, error: data.error || "Product not found" });
        return;
      }
      setProduct(data);
    } catch {
      setProduct({ notFound: true, error: "Failed to load product details" });
      toast.error("Failed to load product details");
    }
  }

  useEffect(() => {
    if (params?.id) loadProduct();
  }, [params?.id]);

  async function addToCart() {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: params.id, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add to cart");
        return;
      }
      toast.success("Added to cart!");
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to add to cart");
    }
  }

  async function addToWishlist() {
    try {
      const res = await fetch(`/api/wishlist/${params.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update wishlist");
        return;
      }
      toast.success("Added to wishlist!");
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    } catch {
      toast.error("Failed to update wishlist");
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/products/${params.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...review, rating: Number(review.rating) })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit review");
        return;
      }
      toast.success("Review submitted!");
      setReview({ rating: 5, comment: "" });
      await loadProduct();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (!product) {
    return (
      <section className="grid detail" aria-busy="true" aria-label="Loading product details">
        <div className="skeleton detail-image" style={{ height: "380px" }} />
        <div className="stack">
          <div className="skeleton" style={{ height: "24px", width: "120px" }} />
          <div className="skeleton" style={{ height: "36px", width: "70%" }} />
          <div className="skeleton" style={{ height: "80px", width: "100%" }} />
          <div className="skeleton" style={{ height: "32px", width: "160px" }} />
          <div className="skeleton" style={{ height: "44px", width: "200px" }} />
        </div>
      </section>
    );
  }

  if (product.notFound) {
    return (
      <section className="panel stack" style={{ textAlign: "center", padding: "48px 20px", margin: "20px 0" }}>
        <h2>Product Not Found</h2>
        <p className="muted" style={{ margin: "8px 0 16px" }}>
          {product.error || "The product you are looking for does not exist or has been removed."}
        </p>
        <div>
          <Link href="/products" className="btn-secondary" style={{ textDecoration: "none", display: "inline-block" }}>
            &larr; Back to Products
          </Link>
        </div>
      </section>
    );
  }

  const imageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "";
  const hasDiscount = Number(product.savings || 0) > 0;

  return (
    <section className="stack" style={{ gap: "20px" }}>
      <div className="row" style={{ gap: "8px", alignItems: "center", fontSize: "0.88rem" }}>
        <Link href="/products" className="muted" style={{ textDecoration: "none" }}>
          &larr; Annu Book Store Product Prices &amp; Details
        </Link>
        <span className="muted">/</span>
        <span>{product.name}</span>
      </div>

      <div className="grid detail">
      <div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="detail-image"
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="detail-image" style={{ height: "340px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", color: "#94a3b8" }}>
            📚
          </div>
        )}
      </div>

      <div className="stack">
        <div className="row between">
          <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
            {product.category}
          </span>
          {hasDiscount && (
            <span className="discount-badge">
              {product.discountLabel || `Save ${formatINR(product.savings)}`}
            </span>
          )}
        </div>

        <h1 style={{ margin: "0 0 6px" }}>{product.name}</h1>
        <p className="muted" style={{ fontSize: "1rem", lineHeight: "1.6" }}>{product.description}</p>

        <div className="price">
          <span>{formatINR(product.finalPrice || product.price)}</span>
          {hasDiscount && (
            <span className="strike">{formatINR(product.originalPrice || product.price)}</span>
          )}
        </div>

        <div className="row" style={{ gap: "16px", margin: "6px 0 16px" }}>
          <span className="rating" aria-label={`Rating ${product.rating || 0} out of 5 stars`}>
            ★ {product.rating ? Number(product.rating).toFixed(1) : "0.0"} <span className="muted">({product.ratingCount || 0} customer reviews)</span>
          </span>
          <span className={product.stock > 0 ? "in-stock" : "out-stock"}>
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>

        <div className="row" style={{ gap: "12px", marginBottom: "24px" }}>
          <button className="btn" onClick={addToCart} disabled={product.stock <= 0}>
            {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
          </button>
          <button className="btn-secondary" onClick={addToWishlist}>
            ♡ Add to Wishlist
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />

        <h3>Customer Reviews ({product.reviews?.length || 0})</h3>

        <form onSubmit={submitReview} className="panel stack" aria-label="Submit a review">
          <h4>Write a Review</h4>
          <div>
            <label htmlFor="review-rating">Rating</label>
            <select
              id="review-rating"
              value={review.rating}
              onChange={(e) => setReview({ ...review, rating: e.target.value })}
            >
              <option value={5}>★★★★★ (5 - Excellent)</option>
              <option value={4}>★★★★☆ (4 - Good)</option>
              <option value={3}>★★★☆☆ (3 - Average)</option>
              <option value={2}>★★☆☆☆ (2 - Below Average)</option>
              <option value={1}>★☆☆☆☆ (1 - Poor)</option>
            </select>
          </div>

          <div>
            <label htmlFor="review-comment">Your Review</label>
            <textarea
              id="review-comment"
              placeholder="Share your thoughts about this product..."
              value={review.comment}
              onChange={(e) => setReview({ ...review, comment: e.target.value })}
              required
            />
          </div>

          <button className="btn" style={{ alignSelf: "flex-start" }} disabled={reviewSubmitting}>
            {reviewSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>

        <div className="stack">
          {product.reviews?.map((item) => {
            const r = Math.max(1, Math.min(5, Math.round(Number(item.rating) || 5)));
            return (
              <div key={item._id} className="panel stack" style={{ padding: "16px" }}>
                <div className="row between">
                  <strong>{item.userId?.name || "Customer"}</strong>
                  <span className="rating" aria-label={`Rated ${r} out of 5`}>
                    {"★".repeat(r)}{"☆".repeat(5 - r)}
                  </span>
                </div>
                <p style={{ margin: 0 }}>{item.comment}</p>
              </div>
            );
          })}
          {!product.reviews?.length && (
            <p className="muted">No reviews yet for this product. Be the first to leave a review!</p>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}


