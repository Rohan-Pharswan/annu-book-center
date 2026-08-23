"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";

const initial = {
  name: "",
  category: "Books",
  type: "book",
  price: 0,
  stock: 0,
  description: "",
  images: []
};

const discountInitial = {
  enabled: false,
  discountType: "percentage",
  value: 10
};

function normalizeImageInput(value) {
  if (typeof value !== "string") return "";
  let text = value.trim();
  if (!text) return "";

  // Accept pasted values like "https://example.com/a.jpg".
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (!text) return "";
  if (text.startsWith("data:image/")) return text;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(text)) return `https://${text}`;
  return text;
}

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);

  const [listPagination, setListPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [form, setForm] = useState(initial);
  const [imageData, setImageData] = useState("");
  const [imageSource, setImageSource] = useState("url");
  const [editingId, setEditingId] = useState(null);
  const [currentProductDiscount, setCurrentProductDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState(discountInitial);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [finderQuery, setFinderQuery] = useState("");
  const [finderItems, setFinderItems] = useState([]);
  const [finderPagination, setFinderPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [finderPage, setFinderPage] = useState(1);
  const [finderLoading, setFinderLoading] = useState(false);

  async function loadProducts(page = 1) {
    setListLoading(true);
    const res = await fetch(`/api/products?limit=20&page=${page}`);
    const data = await res.json();
    setProducts(data.items || []);
    setListPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    setListLoading(false);
  }

  async function loadFinderProducts(query, page = 1) {
    setFinderLoading(true);
    const q = query.trim();
    const qPart = q ? `&q=${encodeURIComponent(q)}` : "";
    const res = await fetch(`/api/products?limit=10&page=${page}${qPart}`);
    const data = await res.json();
    setFinderItems(data.items || []);
    setFinderPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    setFinderLoading(false);
  }

  useEffect(() => {
    loadProducts(listPage);
  }, [listPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFinderProducts(finderQuery, finderPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [finderQuery, finderPage]);

  async function handleFileUpload(file) {
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawBase64 = String(reader.result || "");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: rawBase64 })
        });
        const data = await res.json();
        if (res.ok && data.imageUrl) {
          setForm((prev) => ({ ...prev, images: [data.imageUrl] }));
          setImageData(data.imageUrl);
          toast.success("Image uploaded to Cloudinary successfully");
        } else {
          toast.error(data.error || "Image upload failed");
          setImageData("");
          setForm((prev) => ({ ...prev, images: [] }));
        }
      } catch {
        toast.error("Network error while uploading image");
        setImageData("");
        setForm((prev) => ({ ...prev, images: [] }));
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setForm(initial);
    setImageData("");
    setEditingId(null);
    setImageSource("url");
    setUploadingImage(false);
    setDiscountForm(discountInitial);
    setCurrentProductDiscount(null);
  }

  async function applyProductDiscount(productId) {
    const existing = currentProductDiscount;
    const enabled = Boolean(discountForm.enabled);
    const discountType = discountForm.discountType === "flat" ? "flat" : "percentage";
    const numericValue = Number(discountForm.value);

    if (!enabled) {
      if (existing && existing.active) {
        await fetch("/api/discounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existing._id, active: false })
        });
        setCurrentProductDiscount({ ...existing, active: false });
      }
      return;
    }

    if (!Number.isFinite(numericValue) || numericValue <= 0) return;

    const payload = {
      scopeType: "product",
      productId,
      discountType,
      active: true,
      percentage: discountType === "percentage" ? numericValue : undefined,
      value: discountType === "flat" ? numericValue : undefined
    };

    if (existing) {
      await fetch("/api/discounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing._id, ...payload })
      });
      setCurrentProductDiscount({ ...existing, ...payload });
      return;
    }

    const res = await fetch("/api/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data?.discount) setCurrentProductDiscount(data.discount);
  }

  async function submitProduct(e) {
    e.preventDefault();
    setSubmitting(true);
    const normalizedImage = normalizeImageInput(imageData);
    const normalizedImages = Array.isArray(form.images)
      ? form.images
          .map((img) => normalizeImageInput(img))
          .filter((img) => typeof img === "string" && img.trim().length > 0)
      : [];

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock)
    };

    payload.images = normalizedImages.length > 0 ? normalizedImages : normalizedImage ? [normalizedImage] : [];

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to update product");
          return;
        }
        await applyProductDiscount(editingId);
        toast.success("Product updated successfully");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data?.product?._id) {
          toast.error(data.error || data.errors?.[0] || "Failed to create product");
          return;
        }
        await applyProductDiscount(data.product._id);
        toast.success("Product created successfully");
      }
      resetForm();
      await Promise.all([loadProducts(listPage), loadFinderProducts(finderQuery, finderPage)]);
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm("Delete this product permanently?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.info("Product deleted");
      } else {
        toast.error("Failed to delete product");
      }
      await Promise.all([loadProducts(listPage), loadFinderProducts(finderQuery, finderPage)]);
    } catch {
      toast.error("Failed to delete product");
    }
  }


  async function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      category: item.category || "Books",
      type: item.type || "book",
      price: Number(item.price || 0),
      stock: Number(item.stock || 0),
      description: item.description || "",
      images: Array.isArray(item.images) ? item.images : []
    });
    setImageData(Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : "");
    setImageSource("url");
    setDiscountForm(discountInitial);
    setCurrentProductDiscount(null);

    const res = await fetch(`/api/discounts?scopeType=product&productId=${item._id}`);
    const data = await res.json();
    const existingDiscount = (data.discounts || [])[0] || null;
    if (!existingDiscount) return;

    const type = existingDiscount.discountType === "flat" ? "flat" : "percentage";
    const value = type === "flat" ? existingDiscount.value : existingDiscount.percentage ?? existingDiscount.value;
    setCurrentProductDiscount(existingDiscount);
    setDiscountForm({
      enabled: Boolean(existingDiscount.active),
      discountType: type,
      value: Number(value || 0)
    });
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Product Management</h1>
        <form onSubmit={submitProduct} className="panel stack">
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
          <div className="row">
            <label>
              <input
                type="radio"
                name="imageSource"
                value="url"
                checked={imageSource === "url"}
                onChange={() => setImageSource("url")}
              />{" "}
              Image URL
            </label>
            <label>
              <input
                type="radio"
                name="imageSource"
                value="device"
                checked={imageSource === "device"}
                onChange={() => setImageSource("device")}
              />{" "}
              Upload from device
            </label>
          </div>
          {imageSource === "url" ? (
            <input
              placeholder='Image URL (e.g. "https://example.com/image.jpg")'
              value={imageData}
              onChange={(e) => {
                setImageData(e.target.value);
                setForm((prev) => ({ ...prev, images: [e.target.value] }));
              }}
            />
          ) : (
            <div className="stack" style={{ gap: "8px" }}>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploadingImage ? (
                <p style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, margin: 0 }}>
                  ⏳ Uploading image to Cloudinary storage, please wait...
                </p>
              ) : (
                <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
                  Select an image (PNG, JPG, WEBP). It will be optimized and uploaded directly to Cloudinary.
                </p>
              )}
            </div>
          )}

          {imageData ? (
            <div className="panel row align-center" style={{ gap: "16px", padding: "12px", background: "var(--surface)" }}>
              <img
                src={imageData}
                alt="Product preview"
                style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <div className="stack" style={{ gap: "4px" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Image Ready for Product</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  {imageData.includes("cloudinary.com") ? "Hosted on Cloudinary CDN" : "Direct Image URL"}
                </span>
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ alignSelf: "flex-start", padding: "2px 8px", fontSize: "0.75rem" }}
                  onClick={() => {
                    setImageData("");
                    setForm((prev) => ({ ...prev, images: [] }));
                  }}
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : null}

          <div className="panel stack">
            <label>
              <input
                type="checkbox"
                checked={discountForm.enabled}
                onChange={(e) => setDiscountForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />{" "}
              Apply product-specific discount
            </label>
            <div className="grid two">
              <select
                value={discountForm.discountType}
                onChange={(e) => setDiscountForm((prev) => ({ ...prev, discountType: e.target.value }))}
                disabled={!discountForm.enabled}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">{"Fixed Amount (\u20B9)"}</option>
              </select>
              <input
                type="number"
                min={1}
                max={discountForm.discountType === "percentage" ? 90 : undefined}
                value={discountForm.value}
                onChange={(e) => setDiscountForm((prev) => ({ ...prev, value: e.target.value }))}
                disabled={!discountForm.enabled}
              />
            </div>
          </div>
          <div className="row">
            <button className="btn" disabled={submitting || uploadingImage}>
              {uploadingImage ? "Uploading Image..." : editingId ? "Save Product" : "Add Product"}
            </button>
            {editingId ? (
              <button type="button" className="ghost-btn" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="panel stack">
          <h2>Find Book / Product</h2>
          <input
            placeholder="Search by name, category, or product ID"
            value={finderQuery}
            onChange={(e) => {
              setFinderQuery(e.target.value);
              setFinderPage(1);
            }}
          />
          <div className="stack">
            {finderItems.map((item) => {
              return (
                <div key={`finder-${item._id}`} className="panel stack">
                  <div className="row between">
                    <strong>{item.name}</strong>
                    <button type="button" className="ghost-btn" onClick={() => startEdit(item)}>
                      Edit This Product
                    </button>
                  </div>
                  <span>Product ID: {item._id}</span>
                  <span>Category: {item.category}</span>
                  <span>Type: {item.type}</span>
                  <span>Price: {formatINR(item.price)}</span>
                  <span>Stock: {item.stock}</span>
                  <span>Description: {item.description}</span>
                  <span>Image: {Array.isArray(item.images) && item.images[0] ? item.images[0] : "No image"}</span>
                  <span>{item.discountLabel ? `Discount: ${item.discountLabel}` : "Discount: No active discount"}</span>
                </div>
              );
            })}
            {finderLoading ? <span>Loading products...</span> : null}
            {!finderLoading && finderItems.length === 0 ? <span>No products found.</span> : null}
          </div>
          <div className="row">
            <button
              type="button"
              className="ghost-btn"
              disabled={finderPagination.page <= 1}
              onClick={() => setFinderPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span>
              Page {finderPagination.page} / {finderPagination.pages || 1}
            </span>
            <button
              type="button"
              className="ghost-btn"
              disabled={finderPagination.page >= (finderPagination.pages || 1)}
              onClick={() => setFinderPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div className="stack">
          {products.map((item) => (
            <div key={item._id} className="panel row between">
              <span>
                {item.name} ({formatINR(item.price)}) | Stock: {item.stock}
                {item.discountLabel ? ` | Discount: ${item.discountLabel}` : ""}
              </span>
              <div className="row">
                <button className="ghost-btn" onClick={() => startEdit(item)}>
                  Full Edit
                </button>
                <button className="ghost-btn" onClick={() => deleteProduct(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {listLoading ? <span>Loading products...</span> : null}
        </div>
        <div className="row">
          <button
            type="button"
            className="ghost-btn"
            disabled={listPagination.page <= 1}
            onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span>
            Page {listPagination.page} / {listPagination.pages || 1}
          </span>
          <button
            type="button"
            className="ghost-btn"
            disabled={listPagination.page >= (listPagination.pages || 1)}
            onClick={() => setListPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </AuthGate>
  );
}
