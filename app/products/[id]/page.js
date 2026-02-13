"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatINR } from "@/lib/currency";

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });

  async function loadProduct() {
    const res = await fetch(`/api/products/${params.id}`);
    const data = await res.json();
    setProduct(data);
  }

  useEffect(() => {
    if (params?.id) loadProduct();
  }, [params?.id]);

  async function addToCart() {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: params.id, quantity: 1 })
    });
  }

  async function submitReview(e) {
    e.preventDefault();
    await fetch(`/api/products/${params.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...review, rating: Number(review.rating) })
    });
    setReview({ rating: 5, comment: "" });
    await loadProduct();
  }

  if (!product) return <p>Loading...</p>;

  return (
    <section className="grid detail">
      <div>
        <img src={product.images?.[0]} alt={product.name} className="detail-image" />
      </div>
      <div>
        <p className="muted">{product.category}</p>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">
          {formatINR(product.finalPrice || product.price)}
          {Number(product.savings || 0) > 0 && (
            <span className="strike">{formatINR(product.originalPrice || product.price)}</span>
          )}
        </p>
        {Number(product.savings || 0) > 0 && <p className="muted">You save {formatINR(product.savings)}</p>}
        <p className={product.stock > 0 ? "in-stock" : "out-stock"}>
          {product.stock > 0 ? "In stock" : "Out of stock"}
        </p>
        <button className="btn" onClick={addToCart} disabled={product.stock <= 0}>
          Add to cart
        </button>

        <h3>Reviews</h3>
        <form onSubmit={submitReview} className="stack">
          <select value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Write your review"
            value={review.comment}
            onChange={(e) => setReview({ ...review, comment: e.target.value })}
            required
          />
          <button className="btn">Submit Review</button>
        </form>

        <div className="stack">
          {product.reviews?.map((item) => (
            <div key={item._id} className="panel">
              <strong>{item.userId?.name || "User"}</strong>
              <p>{item.rating} / 5</p>
              <p>{item.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
