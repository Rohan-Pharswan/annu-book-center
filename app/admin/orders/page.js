"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

const statuses = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  async function load() {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, status) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Manage Orders</h1>
        <div className="stack">
          {orders.map((order) => (
            <div key={order._id} className="panel">
              <p>
                <strong>{order.userId?.name}</strong> ({order.userId?.email})
              </p>
              <p>Total: ${order.totalAmount.toFixed(2)}</p>
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

