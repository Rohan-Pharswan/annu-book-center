"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

const initial = {
  name: "",
  category: "Books",
  type: "book",
  price: 0,
  stock: 0,
  description: "",
  images: [""]
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initial);
  const [imageData, setImageData] = useState("");

  async function loadProducts() {
    const res = await fetch("/api/products?limit=100");
    const data = await res.json();
    setProducts(data.items || []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function uploadImage() {
    if (!imageData) return;
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData })
    });
    const data = await res.json();
    if (data.imageUrl) setForm((prev) => ({ ...prev, images: [data.imageUrl] }));
  }

  async function createProduct(e) {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock)
      })
    });
    setForm(initial);
    setImageData("");
    await loadProducts();
  }

  async function deleteProduct(id) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  }

  async function quickUpdate(item) {
    const price = prompt("New price", String(item.price));
    const stock = prompt("New stock", String(item.stock));
    if (price === null || stock === null) return;
    await fetch(`/api/products/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(price), stock: Number(stock) })
    });
    await loadProducts();
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Product Management</h1>
        <form onSubmit={createProduct} className="panel stack">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid two">
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="book">Book</option>
              <option value="stationery">Stationery</option>
            </select>
            <input type="number" min={0} placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input type="number" min={0} placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input
            placeholder="Image URL (or Data URL for upload)"
            value={imageData}
            onChange={(e) => setImageData(e.target.value)}
          />
          <div className="row">
            <button type="button" className="ghost-btn" onClick={uploadImage}>
              Upload Image
            </button>
            <button className="btn">Add Product</button>
          </div>
        </form>

        <div className="stack">
          {products.map((item) => (
            <div key={item._id} className="panel row between">
              <span>
                {item.name} (${item.price}) | Stock: {item.stock}
              </span>
              <div className="row">
                <button className="ghost-btn" onClick={() => quickUpdate(item)}>
                  Edit
                </button>
                <button className="ghost-btn" onClick={() => deleteProduct(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}
