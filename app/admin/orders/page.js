"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";

const statuses = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

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
          {visibleOrders.map((order) => (
            <div key={order._id} className="panel">
              <p>
                <strong>{order.userId?.name}</strong> ({order.userId?.email})
              </p>
              <p>Total: {formatINR(order.totalAmount)}</p>
              <p>Status: {order.status}</p>
              <select value={order.status} onChange={(e) => updateStatus(order._id, e.target.value)}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}
