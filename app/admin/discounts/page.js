"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

const initial = { scopeType: "category", productId: "", category: "", percentage: 10, active: true };

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [form, setForm] = useState(initial);

  async function load() {
    const res = await fetch("/api/discounts");
    const data = await res.json();
    setDiscounts(data.discounts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await fetch("/api/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, percentage: Number(form.percentage) })
    });
    setForm(initial);
    await load();
  }

  async function toggle(discount) {
    await fetch("/api/discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: discount._id, active: !discount.active })
    });
    await load();
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Discount Management</h1>
        <form onSubmit={create} className="panel stack">
          <select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })}>
            <option value="category">By Category</option>
            <option value="product">By Product ID</option>
          </select>
          {form.scopeType === "category" ? (
            <input placeholder="Category name" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          ) : (
            <input placeholder="Product ID" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required />
          )}
          <input
            type="number"
            min={1}
            max={90}
            value={form.percentage}
            onChange={(e) => setForm({ ...form, percentage: e.target.value })}
            required
          />
          <button className="btn">Create Discount</button>
        </form>

        <div className="stack">
          {discounts.map((d) => (
            <div key={d._id} className="panel row between">
              <span>
                {d.scopeType === "category" ? `Category: ${d.category}` : `Product: ${d.productId}`} | {d.percentage}%
              </span>
              <button className="ghost-btn" onClick={() => toggle(d)}>
                {d.active ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

