"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";
import { STORE_CONFIG, getAdminToCustomerWhatsAppUrl, getCustomerMapSearchUrl } from "@/lib/storeConfig";

const statuses = [
  "Pending",
  "Confirmed",
  "Ready for Pickup",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [deliveryFees, setDeliveryFees] = useState({});
  const [savingFee, setSavingFee] = useState({});
  const [focusedOrderId, setFocusedOrderId] = useState("");
  const toast = useToast();

  function getOrderDisplay(order) {
    const deliveryCharge = Number(order.deliveryCharge ?? 0);
    const deliveryChargeStatus =
      order.deliveryChargeStatus || (order.fulfillmentType === "store_visit" ? "not_required" : (deliveryCharge > 0 ? "confirmed" : "pending"));
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, deliveryChargeStatus, subtotalAmount, totalSavings };
  }

  async function load() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      const list = data.orders || [];
      setOrders(list);

      // Initialize delivery fee state
      const initialFees = {};
      for (const ord of list) {
        initialFees[ord._id] = ord.deliveryCharge ?? 0;
      }
      setDeliveryFees(initialFees);
    } catch {
      toast.error("Failed to load orders");
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("orderId");
      if (targetId) {
        setFocusedOrderId(targetId);
        setTimeout(() => {
          const el = document.getElementById(`order-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 200);
      }
    }
  }, [orders]);

  async function updateStatus(id, status) {
    try {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success(`Order status updated to ${status}`);
      await load();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function confirmDeliveryCharge(orderId) {
    const fee = Number(deliveryFees[orderId]);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Please enter a valid delivery charge (₹0 or greater)");
      return;
    }

    setSavingFee((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delivery-charge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryCharge: fee })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update delivery charge");
        return;
      }
      if (data.alreadyConfirmed) {
        toast.success(`Delivery charge is already confirmed at ₹${fee}`);
      } else {
        toast.success(`Delivery charge set to ₹${fee} (Total: ₹${data.order?.totalAmount})`);
      }
      await load();
    } catch {
      toast.error("Failed to update delivery charge");
    } finally {
      setSavingFee((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function setVerification(id, payload) {
    try {
      const res = await fetch(`/api/admin/orders/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update verification");
        return;
      }
      toast.success("Verification status updated");
      await load();
    } catch {
      toast.error("Failed to update verification");
    }
  }

  async function deleteOrder(id) {
    const confirmed = window.confirm("Delete this order permanently?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete order");
        return;
      }
      toast.success("Order deleted successfully");
      await load();
    } catch {
      toast.error("Failed to delete order");
    }
  }

  function copyAddress(addr) {
    if (!addr) {
      toast.error("No address information available");
      return;
    }
    const full = [addr.line1, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
    navigator.clipboard.writeText(full);
    toast.success("Address copied to clipboard!");
  }

  const visibleOrders = useMemo(() => {
    let items = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const qClean = q.replace(/[^a-z0-9]/g, "");
      const qNoHash = q.replace(/^#/, "");

      items = items.filter((order) => {
        const id = String(order._id || "").toLowerCase();
        const shortId = id.slice(-6);
        const name = (order.customerName || order.userId?.name || "").toLowerCase();
        const phone = (order.customerPhone || order.address?.phone || order.userId?.phone || "").toLowerCase();
        const cleanPhone = phone.replace(/\D/g, "");

        return (
          id.includes(q) ||
          (qNoHash && id.includes(qNoHash)) ||
          shortId.includes(qNoHash) ||
          name.includes(q) ||
          phone.includes(q) ||
          (qClean && cleanPhone.includes(qClean))
        );
      });
    }

    if (sortBy === "Oldest") {
      items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return items;
    }
    if (sortBy === "Amount High-Low") {
      items.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
      return items;
    }
    if (sortBy === "Amount Low-High") {
      items.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
      return items;
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items;
  }, [orders, searchQuery, sortBy]);

  return (
    <AuthGate role="admin">
      <section>
        <div className="row between" style={{ alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h1 style={{ margin: 0 }}>Manage Orders</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
              Total loaded orders: <strong>{orders.length}</strong>
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="panel stack" style={{ gap: "12px", background: "var(--surface)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          {/* Prominent Search Input */}
          <div className="row" style={{ gap: "8px", alignItems: "center", width: "100%" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                id="search-orders-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search orders by #ID, customer name, or phone number..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "0.95rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)"
                }}
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearchQuery("")}
                style={{ padding: "10px 14px", fontSize: "0.9rem", whiteSpace: "nowrap" }}
              >
                ✕ Clear Search
              </button>
            )}
          </div>

          {/* Filter & Sort Row */}
          <div className="row between" style={{ gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="row" style={{ gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="status-filter" style={{ fontSize: "0.88rem", fontWeight: 600, margin: 0 }}>
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "6px 10px", fontSize: "0.88rem" }}
              >
                <option value="All">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <label htmlFor="sort-by" style={{ fontSize: "0.88rem", fontWeight: 600, margin: 0 }}>
                Sort:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: "6px 10px", fontSize: "0.88rem" }}
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
                <option value="Amount High-Low">Amount High-Low</option>
                <option value="Amount Low-High">Amount Low-High</option>
              </select>
            </div>

            {searchQuery && (
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Showing <strong>{visibleOrders.length}</strong> matching order{visibleOrders.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>

        {focusedOrderId && (
          <div className="panel row between" style={{ background: "rgba(37, 99, 235, 0.08)", border: "2px solid #2563eb", padding: "12px 16px", alignItems: "center", borderRadius: "8px", marginTop: "12px" }}>
            <div>
              <strong style={{ color: "#1e40af" }}>🎯 Focused Order: #{focusedOrderId.slice(-6)}</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#1e3a8a" }}>
                Viewing order opened directly from admin alerts.
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
              onClick={() => {
                setFocusedOrderId("");
                window.history.replaceState({}, "", "/admin/orders");
              }}
            >
              Clear Focus ✕
            </button>
          </div>
        )}

        <div className="stack" style={{ gap: "16px", marginTop: "16px" }}>
          {visibleOrders.map((order) => {
            const { deliveryCharge, deliveryChargeStatus, subtotalAmount, totalSavings } = getOrderDisplay(order);
            const isHomeDelivery = order.fulfillmentType === "doorstep" || !order.fulfillmentType;
            const isFocused = focusedOrderId === String(order._id);
            const customerPhone = order.customerPhone || order.address?.phone || "";
            const customerName = order.userId?.name || "Customer";
            const mapUrl = getCustomerMapSearchUrl(order.address);
            const waUrl = getAdminToCustomerWhatsAppUrl({
              customerPhone,
              customerName,
              orderId: order._id
            });

            return (
              <div
                key={order._id}
                id={`order-${order._id}`}
                className="panel stack"
                style={{
                  borderLeft: isFocused
                    ? "6px solid #2563eb"
                    : isHomeDelivery && deliveryChargeStatus === "pending"
                    ? "5px solid #f59e0b"
                    : "1px solid var(--border)",
                  boxShadow: isFocused ? "0 0 0 3px rgba(37, 99, 235, 0.3)" : undefined,
                  background: isFocused ? "rgba(37, 99, 235, 0.02)" : undefined,
                  padding: "18px",
                  gap: "10px",
                  borderRadius: "8px",
                  transition: "all 0.3s ease"
                }}
              >
                {/* Top Row: Customer & Order Meta */}
                <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>
                      Order #{order._id.slice(-6)} &mdash; <strong>{customerName}</strong>
                    </h3>
                    <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                      Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                      {new Date(order.createdAt).toLocaleTimeString()} &bull; Phone: <strong>{customerPhone || "N/A"}</strong>
                    </p>
                  </div>
                  <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                    <span className="badge" style={{ fontWeight: 700 }}>
                      {order.fulfillmentType === "store_visit" ? "🏬 Store Pickup" : "🏠 Home Delivery"}
                    </span>
                    <span className={`status status-${(order.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Home Delivery Location & Store Visit Details */}
                {order.fulfillmentType === "store_visit" ? (
                  <div className="panel stack" style={{ background: "var(--surface-muted, rgba(0,0,0,0.02))", padding: "10px", margin: "4px 0" }}>
                    <p style={{ margin: 0 }}>
                      <strong>🏬 Store Visit Planned:</strong> {order.storeVisit?.visitDate || "Scheduled"} ({order.storeVisit?.visitTime || "Store Hours"})
                    </p>
                    <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                      Location: {STORE_CONFIG.name} &bull; {STORE_CONFIG.address}
                    </p>
                  </div>
                ) : order.address ? (
                  <div className="panel row between" style={{ background: "var(--surface-muted, #f8fafc)", padding: "10px 14px", borderRadius: "6px", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--muted)" }}>📍 DELIVERY ADDRESS:</strong>
                      <p style={{ margin: "2px 0 0", fontSize: "0.92rem" }}>
                        {order.address.label} &mdash; {order.address.line1}, {order.address.city}, {order.address.state} &mdash; <strong>{order.address.postalCode}</strong>
                      </p>
                    </div>
                    <div className="row" style={{ gap: "8px" }}>
                      <button type="button" className="ghost-btn" style={{ fontSize: "0.82rem" }} onClick={() => copyAddress(order.address)}>
                        📋 Copy Address
                      </button>
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ghost-btn" style={{ fontSize: "0.82rem", textDecoration: "none" }}>
                          📍 Open in Maps
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Ordered Items Breakdown */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="order-items-list" style={{ margin: "4px 0" }}>
                    {order.items.map((item, idx) => (
                      <div key={`${item.productId || idx}-${idx}`} className="order-item-row">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="order-item-thumb" />
                        ) : (
                          <div className="order-item-thumb-placeholder">&#128214;</div>
                        )}
                        <div className="order-item-details">
                          <div className="order-item-name">{item.name}</div>
                          <div className="order-item-meta">
                            Qty: {item.quantity} &times; {formatINR(item.price)}
                            {Number(item.savingsPerUnit || 0) > 0 && (
                              <span className="muted"> (Saved {formatINR(item.savingsPerUnit)}/ea)</span>
                            )}
                          </div>
                        </div>
                        <div className="order-item-total">
                          {formatINR(Number(item.price || 0) * Number(item.quantity || 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial Summary & Delivery Charge Control */}
                <div className="row between" style={{ background: "var(--surface-muted, #f8fafc)", padding: "12px", borderRadius: "6px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem" }}>
                      Books Subtotal: <strong>{formatINR(subtotalAmount)}</strong>
                      {totalSavings > 0 && <span style={{ color: "var(--success)", marginLeft: "8px" }}>(Saved {formatINR(totalSavings)})</span>}
                    </div>
                    <div style={{ fontSize: "0.9rem", marginTop: "2px" }}>
                      Delivery Fee:{" "}
                      {order.fulfillmentType === "store_visit" ? (
                        <span style={{ color: "var(--success)", fontWeight: 600 }}>₹0 (Store Pickup)</span>
                      ) : deliveryChargeStatus === "pending" ? (
                        <span style={{ color: "#d97706", fontWeight: 700 }}>To Be Confirmed</span>
                      ) : (
                        <span style={{ color: "var(--success)", fontWeight: 700 }}>{formatINR(deliveryCharge)} (Confirmed)</span>
                      )}
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "4px" }}>
                      Total Amount: {formatINR(order.totalAmount)}
                    </div>
                  </div>

                  {/* Delivery Charge Input for Home Delivery */}
                  {isHomeDelivery && (
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <label htmlFor={`delivery-fee-${order._id}`} style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
                        Set Delivery Fee: ₹
                      </label>
                      <input
                        id={`delivery-fee-${order._id}`}
                        type="number"
                        min="0"
                        step="10"
                        style={{ width: "90px", padding: "6px 8px" }}
                        value={deliveryFees[order._id] ?? 0}
                        onChange={(e) =>
                          setDeliveryFees((prev) => ({ ...prev, [order._id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                        disabled={savingFee[order._id]}
                        onClick={() => confirmDeliveryCharge(order._id)}
                      >
                        {savingFee[order._id] ? "Saving..." : "Confirm Delivery Charge"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions Row: WhatsApp, Call, Status, Verification, Delete */}
                <div className="row between" style={{ marginTop: "4px", paddingTop: "8px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "10px" }}>
                  <div className="row" style={{ gap: "8px", flexWrap: "wrap" }}>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          background: "#25D366",
                          color: "#fff",
                          textDecoration: "none",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px"
                        }}
                      >
                        <span>💬</span> WhatsApp
                      </a>
                    )}
                    {customerPhone && (
                      <a
                        href={`tel:${customerPhone.replace(/\D/g, "")}`}
                        className="btn-secondary"
                        style={{
                          textDecoration: "none",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px"
                        }}
                      >
                        <span>📞</span> Call
                      </a>
                    )}
                  </div>

                  <div className="row" style={{ gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <label htmlFor={`status-select-${order._id}`} style={{ fontSize: "0.85rem", margin: 0 }}>
                      Status:
                    </label>
                    <select
                      id={`status-select-${order._id}`}
                      value={order.status}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                      style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      className="ghost-btn"
                      style={{ fontSize: "0.82rem", padding: "4px 8px" }}
                      onClick={() => setVerification(order._id, { phoneVerifiedByAdmin: !order.phoneVerifiedByAdmin })}
                    >
                      {order.phoneVerifiedByAdmin ? "Phone ✓" : "Verify Phone"}
                    </button>
                    <button
                      className="ghost-btn"
                      style={{ fontSize: "0.82rem", padding: "4px 8px", color: "var(--danger)" }}
                      onClick={() => deleteOrder(order._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!visibleOrders.length && (
            <div className="panel stack" style={{ textAlign: "center", padding: "36px 20px", borderRadius: "8px" }}>
              {searchQuery ? (
                <>
                  <h3 style={{ margin: 0 }}>No orders found</h3>
                  <p className="muted" style={{ margin: "4px 0 12px", fontSize: "0.92rem" }}>
                    No orders match your search <strong>"{searchQuery}"</strong>
                    {statusFilter !== "All" ? ` in status "${statusFilter}"` : ""}.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSearchQuery("")}
                      style={{ fontSize: "0.88rem" }}
                    >
                      ✕ Clear Search
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ margin: 0 }}>No orders found</h3>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.92rem" }}>
                    No orders found for status filter <strong>"{statusFilter}"</strong>.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </AuthGate>
  );
}
