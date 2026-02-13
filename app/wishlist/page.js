"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { formatINR } from "@/lib/currency";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);

  async function loadWishlist() {
    const res = await fetch("/api/wishlist");
    const data = await res.json();
    setWishlist(data.wishlist || []);
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  async function remove(productId) {
    await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
    await loadWishlist();
  }

  return (
    <AuthGate>
      <section>
        <h1>Wishlist</h1>
        <div className="grid">
          {wishlist.map((item) => (
            <article key={item._id} className="card">
              <img src={item.images?.[0]} alt={item.name} className="card-image" />
              <div className="card-body">
                <h3>{item.name}</h3>
                <p>
                  {formatINR(item.finalPrice || item.price)}
                  {Number(item.savings || 0) > 0 && <span className="strike">{formatINR(item.originalPrice || item.price)}</span>}
                </p>
                {Number(item.savings || 0) > 0 && <p className="muted">You save {formatINR(item.savings)}</p>}
                <div className="row">
                  <Link href={`/products/${item._id}`} className="btn">
                    Details
                  </Link>
                  <button className="ghost-btn" onClick={() => remove(item._id)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}
