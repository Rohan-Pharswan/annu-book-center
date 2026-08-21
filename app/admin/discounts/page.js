"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/ToastProvider";

const initial = { scopeType: "category", productId: "", category: "", discountType: "percentage", value: 10, active: true };

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      const res = await fetch("/api/discounts");
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch {
      toast.error("Failed to load discounts");
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    load();
    loadCategories();
  }, []);

  async function create(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: Number(form.value),
          percentage: form.discountType === "percentage" ? Number(form.value) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create discount");
        return;
      }
      toast.success("Discount created successfully");
      setForm(initial);
      await load();
    } catch {
      toast.error("Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(discount) {
    try {
      const res = await fetch("/api/discounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: discount._id, active: !discount.active })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update discount status");
        return;
      }
      toast.info(`Discount ${discount.active ? "disabled" : "enabled"}`);
      await load();
    } catch {
      toast.error("Failed to update discount status");
    }
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
          <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="percentage">Percentage (%)</option>
            <option value="flat">{"Fixed Amount (\u20B9)"}</option>
          </select>
          {form.scopeType === "category" ? (
            <input placeholder="Category name" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          ) : (
            <input placeholder="Product ID" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required />
          )}
          <input
            type="number"
            min={1}
            max={form.discountType === "percentage" ? 90 : undefined}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
          />
          <button className="btn">Create Discount</button>
        </form>

        <div className="stack">
          {discounts.map((d) => (
            <div key={d._id} className="panel row between">
              <span>
                {d.scopeType === "category" ? `Category: ${d.category}` : `Product: ${d.productId}`} |{" "}
                {d.discountType === "flat" ? `\u20B9${d.value} off` : `${d.percentage || d.value}% off`}
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
