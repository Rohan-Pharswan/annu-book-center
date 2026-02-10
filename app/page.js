"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const categories = useMemo(
    () => ["", "Books", "Stationery", "School Supplies", "Office Supplies"],
    []
  );

  async function loadProducts() {
    const params = new URLSearchParams({
      q,
      category,
      page: String(page),
      limit: "8"
    });
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setPages(data.pagination?.pages || 1);
  }

  useEffect(() => {
    loadProducts();
  }, [q, category, page]);

  async function addToCart(productId) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 })
    });
  }

  async function addToWishlist(productId) {
    await fetch(`/api/wishlist/${productId}`, { method: "POST" });
  }

  return (
    <section>
      <h1>Annu Book Store</h1>
      <p className="muted">Books, stationery, and school essentials for local customers.</p>

      <div className="filters">
        <input
          placeholder="Search by product name"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c || "All categories"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid">
        {items.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onWishlist={addToWishlist}
            onCart={addToCart}
          />
        ))}
      </div>

      <div className="pager">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Previous
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
          Next
        </button>
      </div>
    </section>
  );
}

