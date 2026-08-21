"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/ToastProvider";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      toast.error("Failed to load categories");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create category");
        return;
      }
      toast.success("Category created successfully");
      setForm({ name: "", description: "" });
      await load();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete category");
        return;
      }
      toast.info("Category deleted");
      await load();
    } catch {
      toast.error("Failed to delete category");
    }
  }


  return (
    <AuthGate role="admin">
      <section>
        <h1>Category Management</h1>
        <form onSubmit={create} className="panel stack">
          <input placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="btn">Add Category</button>
        </form>
        <div className="stack">
          {categories.map((item) => (
            <div key={item._id} className="panel row between">
              <span>{item.name}</span>
              <button className="ghost-btn" onClick={() => remove(item._id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

