"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  function getOrderDisplay(order) {
    const deliveryCharge = Number(order.deliveryCharge ?? 100);
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, subtotalAmount, totalSavings };
  }

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <AuthGate>
      <section>
        <h1>My Orders</h1>
        {loading ? (
          <div className="stack" aria-label="Loading orders" aria-busy="true">
            <div className="skeleton skeleton-card" style={{ height: "180px" }} />
            <div className="skeleton skeleton-card" style={{ height: "180px" }} />
          </div>
        ) : !orders.length ? (
          <div className="panel stack" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3>No orders found</h3>
            <p className="muted">You haven't placed any orders yet. Start exploring our books and stationery collection.</p>
            <a href="/products" className="btn" style={{ alignSelf: "center", marginTop: "8px" }}>
              Browse Catalog
            </a>
          </div>
        ) : (
          <div className="stack">
            {orders.map((order) => {
              const { deliveryCharge, subtotalAmount, totalSavings } = getOrderDisplay(order);
              const statusClass = `status status-${(order.status || "").toLowerCase()}`;
              return (
                <div key={order._id} className="panel">
                  <div className="row between">
                    <strong>Order #{order._id.slice(-6)}</strong>
                    <span className={statusClass}>{order.status}</span>
                  </div>
                  <p className="muted" style={{ fontSize: "0.88rem", margin: "4px 0 10px" }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>

                  {/* Purchased items breakdown */}
                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <div className="order-items-list">
                      {order.items.map((item, idx) => (
                        <div key={`${item.productId || idx}-${idx}`} className="order-item-row">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="order-item-thumb"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="order-item-thumb-placeholder">
                              📚
                            </div>
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

                  <div className="stack" style={{ fontSize: "0.92rem", gap: "6px" }}>
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <span className="muted">Fulfillment:</span>
                      <span className="badge" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                        {order.fulfillmentType === "store_visit" ? "🏬 Store Visit & In-Store Purchase" : "🚚 Doorstep Delivery (COD)"}
                      </span>
                    </div>

                    <div className="row between">
                      <span className="muted">Subtotal:</span>
                      <span>{formatINR(subtotalAmount)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <div className="row between" style={{ color: "var(--success)" }}>
                        <span>You Saved:</span>
                        <span>-{formatINR(totalSavings)}</span>
                      </div>
                    )}
                    <div className="row between">
                      <span className="muted">
                        {order.fulfillmentType === "store_visit" ? "Delivery Charge (Store Visit):" : "Delivery Fee (COD):"}
                      </span>
                      <span>
                        {order.fulfillmentType === "store_visit" || deliveryCharge === 0 ? (
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>FREE (₹0)</span>
                        ) : (
                          formatINR(deliveryCharge)
                        )}
                      </span>
                    </div>
                    <div className="row between" style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: "4px" }}>
                      <span>Total Amount:</span>
                      <span>{formatINR(order.totalAmount)}</span>
                    </div>

                    {order.fulfillmentType === "store_visit" ? (
                      <div className="panel stack" style={{ marginTop: "6px", background: "var(--surface-muted, rgba(0,0,0,0.02))", padding: "10px" }}>
                        <p style={{ margin: 0 }}>
                          <strong>🏬 Store Visit Planned:</strong> {order.storeVisit?.visitDate || "Scheduled"} &bull; Slot: {order.storeVisit?.visitTime || "Store Hours"}
                        </p>
                        <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                          Location: {order.storeVisit?.storeLocation || "Annu Book Center, Dehradun"}
                        </p>
                      </div>
                    ) : order.address ? (
                      <p style={{ marginTop: "6px" }}>
                        <strong>Delivery to:</strong> {order.address?.label} ({order.address?.phone || order.customerPhone}) &mdash;{" "}
                        {order.address?.line1}, {order.address?.city}, {order.address?.state} - {order.address?.postalCode}
                      </p>
                    ) : null}

                    <p className="muted" style={{ margin: "2px 0 0" }}>Payment Method: {order.paymentMethod || "Cash on Delivery"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AuthGate>
  );
}


