"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });

  async function load() {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ name: "", description: "" });
    await load();
  }

  async function remove(id) {
    await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await load();
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

