"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function loadWishlist() {
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      setWishlist(data.wishlist || []);
    } catch {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  async function remove(productId) {
    try {
      const res = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      if (res.ok) {
        toast.info("Removed from wishlist");
        window.dispatchEvent(new CustomEvent("wishlist-updated"));
      } else {
        toast.error("Failed to remove item");
      }
      await loadWishlist();
    } catch {
      toast.error("Failed to remove item");
    }
  }

  async function addToCart(productId) {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 })
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

  return (
    <AuthGate>
      <section>
        <h1>My Wishlist</h1>
        {loading ? (
          <p className="muted">Loading wishlist...</p>
        ) : wishlist.length === 0 ? (
          <div className="panel stack">
            <p className="muted">Your wishlist is empty.</p>
            <Link href="/products" className="btn" style={{ alignSelf: "flex-start" }}>
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid">
            {wishlist.map((item) => (
              <article key={item._id} className="card">
                <img src={item.images?.[0]} alt={item.name} className="card-image" />
                <div className="card-body">
                  <p className="muted">{item.category}</p>
                  <h3>{item.name}</h3>
                  <p className="price">
                    {formatINR(item.finalPrice || item.price)}
                    {Number(item.savings || 0) > 0 && <span className="strike">{formatINR(item.originalPrice || item.price)}</span>}
                  </p>
                  {Number(item.savings || 0) > 0 && <p className="muted">You save {formatINR(item.savings)}</p>}
                  <p className={item.stock > 0 ? "in-stock" : "out-stock"}>
                    {item.stock > 0 ? `In stock (${item.stock})` : "Out of stock"}
                  </p>
                  <div className="card-actions">
                    <Link href={`/products/${item._id}`} className="btn">
                      Details
                    </Link>
                    <button className="btn" onClick={() => addToCart(item._id)} disabled={item.stock <= 0}>
                      Add Cart
                    </button>
                    <button className="ghost-btn" onClick={() => remove(item._id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AuthGate>
  );
}

