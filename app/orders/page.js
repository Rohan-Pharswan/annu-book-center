"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  function getOrderDisplay(order) {
    const deliveryCharge = Number(order.deliveryCharge ?? 100);
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, subtotalAmount, totalSavings };
  }

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
          {orders.map((order) => {
            const { deliveryCharge, subtotalAmount, totalSavings } = getOrderDisplay(order);
            return (
              <div key={order._id} className="panel">
                <div className="row between">
                  <strong>Order #{order._id.slice(-6)}</strong>
                  <span className="status">{order.status}</span>
                </div>
                <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                <p>Time: {new Date(order.createdAt).toLocaleTimeString()}</p>
                <p>Subtotal: {formatINR(subtotalAmount)}</p>
                <p>You Saved: {formatINR(totalSavings)}</p>
                <p>Delivery Charge: {formatINR(deliveryCharge)}</p>
                <p>Total: {formatINR(order.totalAmount)}</p>
                <p>
                  Address: {order.address?.line1}, {order.address?.city}
                </p>
                <p>Payment: {order.paymentMethod}</p>
              </div>
            );
          })}
          {!orders.length && <p className="muted">No orders yet.</p>}
        </div>
      </section>
    </AuthGate>
  );
}
