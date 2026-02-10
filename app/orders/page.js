"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  async function loadOrders() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <AuthGate>
      <section>
        <h1>My Orders</h1>
        <div className="stack">
          {orders.map((order) => (
            <div key={order._id} className="panel">
              <div className="row between">
                <strong>Order #{order._id.slice(-6)}</strong>
                <span className="status">{order.status}</span>
              </div>
              <p>Total: ${order.totalAmount.toFixed(2)}</p>
              <p>
                Address: {order.address?.line1}, {order.address?.city}
              </p>
              <p>Payment: {order.paymentMethod}</p>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

