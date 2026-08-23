"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { formatINR } from "@/lib/currency";
import { STORE_CONFIG, getCustomerToStoreWhatsAppUrl } from "@/lib/storeConfig";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function getOrderDisplay(order) {
    const deliveryChargeStatus =
      order.deliveryChargeStatus || (order.fulfillmentType === "store_visit" ? "not_required" : "confirmed");
    const deliveryCharge = Number(order.deliveryCharge ?? 0);
    const subtotalAmount = Number(
      order.subtotalAmount ?? Math.max(Number(order.totalAmount || 0) - deliveryCharge, 0)
    );
    const totalSavings = Number(order.totalSavings ?? 0);
    return { deliveryCharge, deliveryChargeStatus, subtotalAmount, totalSavings };
  }

  async function loadOrders() {
    try {
      const [ordersRes, meRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/auth/me")
      ]);
      const ordersData = await ordersRes.json();
      const meData = await meRes.json();
      setOrders(ordersData.orders || []);
      if (meData?.user) setCurrentUser(meData.user);
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
        <h1>My Orders & Reservations</h1>
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
              const { deliveryCharge, deliveryChargeStatus, subtotalAmount, totalSavings } = getOrderDisplay(order);
              const statusClass = `status status-${(order.status || "").toLowerCase().replace(/\s+/g, "-")}`;
              const isHomeDelivery = order.fulfillmentType === "doorstep" || !order.fulfillmentType;
              const isPendingDeliveryFee = isHomeDelivery && deliveryChargeStatus === "pending";

              return (
                <div key={order._id} className="panel" style={{ borderLeft: isPendingDeliveryFee ? "4px solid #f59e0b" : "1px solid var(--border)" }}>
                  <div className="row between">
                    <strong>Order #{order._id.slice(-6)}</strong>
                    <span className={statusClass}>
                      {isPendingDeliveryFee ? "Pending Delivery Charge" : order.status}
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: "0.88rem", margin: "4px 0 10px" }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>

                  {/* Home Delivery Pending Notice & Direct WhatsApp Action */}
                  {isPendingDeliveryFee && (
                    <div
                      className="panel stack"
                      style={{
                        background: "rgba(37, 211, 102, 0.08)",
                        border: "2px solid #25D366",
                        padding: "16px",
                        borderRadius: "8px",
                        marginBottom: "14px"
                      }}
                    >
                      <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "1.4rem" }}>🏠</span>
                        <div>
                          <strong style={{ fontSize: "1.05rem", color: "#166534" }}>
                            Home Delivery Requested &mdash; Please Contact Store on WhatsApp
                          </strong>
                          <p style={{ margin: "2px 0 0", fontSize: "0.88rem", color: "#15803d" }}>
                            Delivery charges depend on your location. Please tap below to send your order details to Annu Book Center on WhatsApp to confirm delivery charges.
                          </p>
                        </div>
                      </div>

                      <div className="row" style={{ gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
                        <a
                          href={getCustomerToStoreWhatsAppUrl(order, currentUser)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{
                            background: "#25D366",
                            color: "#ffffff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            textDecoration: "none",
                            fontWeight: 800,
                            fontSize: "1rem",
                            padding: "10px 18px",
                            boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)"
                          }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>💬</span> Send Order Details to WhatsApp
                        </a>

                        <a
                          href={`tel:${STORE_CONFIG.primaryPhoneRaw}`}
                          className="btn-secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            textDecoration: "none",
                            padding: "10px 14px",
                            fontWeight: 600
                          }}
                        >
                          <span>📞</span> Call 8077308953
                        </a>

                        <a
                          href={`tel:${STORE_CONFIG.altPhoneRaw}`}
                          className="btn-secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            textDecoration: "none",
                            padding: "10px 14px",
                            fontWeight: 600
                          }}
                        >
                          <span>☎️</span> Call 9411395022
                        </a>
                      </div>
                    </div>
                  )}

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
                            <div className="order-item-thumb-placeholder">📚</div>
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
                        {order.fulfillmentType === "store_visit" ? "🏬 Store Pickup & In-Store Purchase" : "🏠 Home Delivery"}
                      </span>
                    </div>

                    <div className="row between">
                      <span className="muted">Books Subtotal:</span>
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
                        {order.fulfillmentType === "store_visit" ? "Delivery Fee (Store Pickup):" : "Delivery Charge (Home Delivery):"}
                      </span>
                      <span>
                        {order.fulfillmentType === "store_visit" ? (
                          <span style={{ color: "var(--success)", fontWeight: 600 }}>FREE (₹0)</span>
                        ) : isPendingDeliveryFee ? (
                          <span style={{ color: "var(--primary)", fontWeight: 700 }}>To be confirmed</span>
                        ) : (
                          <span style={{ color: "var(--success)", fontWeight: 700 }}>{formatINR(deliveryCharge)} (Confirmed)</span>
                        )}
                      </span>
                    </div>
                    <div className="row between" style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: "4px" }}>
                      <span>{isPendingDeliveryFee ? "Current Total (Excl. Delivery):" : "Total Amount:"}</span>
                      <span>{formatINR(order.totalAmount)}</span>
                    </div>

                    {order.fulfillmentType === "store_visit" ? (
                      <div className="panel stack" style={{ marginTop: "6px", background: "var(--surface-muted, rgba(0,0,0,0.02))", padding: "10px" }}>
                        <p style={{ margin: 0 }}>
                          <strong>🏬 Store Visit Planned:</strong> {order.storeVisit?.visitDate || "Scheduled"} &bull; Slot: {order.storeVisit?.visitTime || "Store Hours"}
                        </p>
                        <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                          Store: {STORE_CONFIG.name} &bull; {STORE_CONFIG.address}
                        </p>
                        <div style={{ marginTop: "6px" }}>
                          <a
                            href={STORE_CONFIG.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ghost-btn"
                            style={{ fontSize: "0.82rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>📍</span> Open Store on Google Maps
                          </a>
                        </div>
                      </div>
                    ) : order.address ? (
                      <p style={{ marginTop: "6px" }}>
                        <strong>Delivery to:</strong> {order.address?.label} ({order.address?.phone || order.customerPhone}) &mdash;{" "}
                        {order.address?.line1}, {order.address?.city}, {order.address?.state} - {order.address?.postalCode}
                      </p>
                    ) : null}

                    <p className="muted" style={{ margin: "2px 0 0" }}>Payment Method: {order.paymentMethod || (order.fulfillmentType === "store_visit" ? "Pay at Store" : "Cash on Delivery")}</p>

                    {isHomeDelivery && !isPendingDeliveryFee && (
                      <div style={{ marginTop: "8px" }}>
                        <a
                          href={getCustomerToStoreWhatsAppUrl(order, currentUser)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ghost-btn"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            color: "#166534",
                            fontWeight: 600
                          }}
                        >
                          <span>💬</span> Send Order Details to WhatsApp
                        </a>
                      </div>
                    )}
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


