"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";

const statuses = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  function getOrderDisplay(order) {
    const deliveryCharge = Number(order.deliveryCharge ?? 100);
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, subtotalAmount, totalSavings };
  }

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function updateStatus(id, status) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  }

  async function setVerification(id, payload) {
    await fetch(`/api/admin/orders/${id}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await load();
  }

  async function deleteOrder(id) {
    const confirmed = window.confirm("Delete this order permanently?");
    if (!confirmed) return;
    await fetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await load();
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
                <p>Total: {formatINR(order.totalAmount)}</p>
                <p>Status: {order.status}</p>
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
