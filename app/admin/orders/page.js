"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";

const statuses = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const toast = useToast();

  function getOrderDisplay(order) {
    const deliveryCharge = Number(order.deliveryCharge ?? 100);
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, subtotalAmount, totalSavings };
  }

  async function load() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("Failed to load orders");
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

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


  const visibleOrders = useMemo(() => {
    const items = [...orders];
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
  }, [orders, sortBy]);

  return (
    <AuthGate role="admin">
      <section>
        <h1>Manage Orders</h1>
        <div className="panel row">
          <label htmlFor="status-filter">Filter</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <label htmlFor="sort-by">Sort</label>
          <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
            <option value="Amount High-Low">Amount High-Low</option>
            <option value="Amount Low-High">Amount Low-High</option>
          </select>
        </div>
        <div className="stack">
          {visibleOrders.map((order) => {
            const { deliveryCharge, subtotalAmount, totalSavings } = getOrderDisplay(order);
            return (
              <div key={order._id} className="panel">
                <p>
                  <strong>{order.userId?.name}</strong> ({order.userId?.email})
                </p>
                <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                <p>Time: {new Date(order.createdAt).toLocaleTimeString()}</p>
                <p>Phone: {order.customerPhone || order.address?.phone || "N/A"}</p>
                <p>Email: {order.customerEmail || order.userId?.email || "N/A"}</p>
                <p>
                  Email Verified: {order.emailVerifiedByAdmin ? "Yes" : "No"} | Phone Verified:{" "}
                  {order.phoneVerifiedByAdmin ? "Yes" : "No"}
                </p>
                <p>Subtotal: {formatINR(subtotalAmount)}</p>
                <p>You Saved: {formatINR(totalSavings)}</p>
                <p>Delivery Charge: {formatINR(deliveryCharge)}</p>
                <p><strong>Total: {formatINR(order.totalAmount)}</strong></p>
                <p>Status: <span className="status">{order.status}</span></p>

                {/* Ordered Items Breakdown */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="order-items-list">
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

                <div className="row">
                  <select value={order.status} onChange={(e) => updateStatus(order._id, e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    className="ghost-btn"
                    onClick={() => setVerification(order._id, { emailVerifiedByAdmin: !order.emailVerifiedByAdmin })}
                  >
                    {order.emailVerifiedByAdmin ? "Unverify Email" : "Verify Email"}
                  </button>
                  <button
                    className="ghost-btn"
                    onClick={() => setVerification(order._id, { phoneVerifiedByAdmin: !order.phoneVerifiedByAdmin })}
                  >
                    {order.phoneVerifiedByAdmin ? "Unverify Phone" : "Verify Phone"}
                  </button>
                  <button className="ghost-btn" onClick={() => deleteOrder(order._id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {!visibleOrders.length && <p className="muted">No orders found for the selected filter.</p>}
        </div>
      </section>
    </AuthGate>
  );
}
