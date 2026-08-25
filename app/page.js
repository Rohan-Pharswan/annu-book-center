"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { ensureAuthenticated } = useAuth();

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // Fallback if category API fails
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
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
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [q, category, page]);

  async function addToCart(productId) {
    // 1. Pre-check auth BEFORE calling /api/cart
    const isAuthed = await ensureAuthenticated("cart");
    if (!isAuthed) return;

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized" || data.error === "Invalid session") {
          ensureAuthenticated("cart");
          return;
        }
        toast.error(data.error || "Failed to add to cart");
        return;
      }
      toast.success("Added to cart!");
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to add to cart");
    }
  }

  async function addToWishlist(productId) {
    // 1. Pre-check auth BEFORE calling /api/wishlist
    const isAuthed = await ensureAuthenticated("wishlist");
    if (!isAuthed) return;

    try {
      const res = await fetch(`/api/wishlist/${productId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized" || data.error === "Invalid session") {
          ensureAuthenticated("wishlist");
          return;
        }
        toast.error(data.error || "Failed to update wishlist");
        return;
      }
      toast.success("Added to wishlist!");
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    } catch {
      toast.error("Failed to update wishlist");
    }
  }


  return (
    <section>
      <div className="hero">
        <h1>Annu Book Store</h1>
        <p className="muted">Books, stationery, and school essentials for local customers.</p>
      </div>

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
          <option value="">All categories</option>
          {categories.map((c) => {
            const catName = typeof c === "string" ? c : c.name;
            const catId = typeof c === "string" ? c : c._id;
            return (
              <option key={catId || catName} value={catName}>
                {catName}
              </option>
            );
          })}
        </select>
      </div>

      {loading ? (
        <div className="grid" aria-label="Loading products" aria-busy="true">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
        </div>
      ) : items.length === 0 ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h3>No products found</h3>
          <p className="muted">We couldn't find any products matching your search or category filter.</p>
          {(q || category) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ alignSelf: "center", marginTop: "8px" }}
              onClick={() => {
                setQ("");
                setCategory("");
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
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
      )}

      {pages > 1 && (
        <div className="pager" role="navigation" aria-label="Pagination">
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Go to previous page"
          >
            Previous
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>
            Page {page} of {pages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}


