"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";
import { getAdminToCustomerWhatsAppUrl, getCustomerMapSearchUrl } from "@/lib/storeConfig";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deliveryFees, setDeliveryFees] = useState({});
  const [savingFee, setSavingFee] = useState({});
  const toast = useToast();

  async function load() {
    try {
      const res = await fetch("/api/admin/notifications?limit=50");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      await load();
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to update notification");
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true })
      });
      await load();
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to update notifications");
    }
  }

  async function confirmDeliveryFeeDirectly(orderId, notifId) {
    const fee = Number(deliveryFees[notifId]);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Please enter a valid delivery charge (₹0 or greater)");
      return;
    }

    setSavingFee((prev) => ({ ...prev, [notifId]: true }));
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
        toast.success(`Delivery charge confirmed at ₹${fee} (Total: ₹${data.order?.totalAmount})`);
      }
      await load();
    } catch {
      toast.error("Failed to update delivery charge");
    } finally {
      setSavingFee((prev) => ({ ...prev, [notifId]: false }));
    }
  }

  function copyAddressToClipboard(addr) {
    if (!addr) {
      toast.error("No address information available");
      return;
    }
    const full = [addr.line1, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
    navigator.clipboard.writeText(full);
    toast.success("Delivery address copied to clipboard!");
  }

  const { actionRequiredList, confirmedList } = useMemo(() => {
    const action = [];
    const confirmed = [];

    for (const item of notifications) {
      const meta = item.meta || {};
      const isHomeDelivery = item.type === "home_delivery_request" || meta.fulfillmentType === "doorstep";
      const deliveryChargeStatus = meta.liveDeliveryChargeStatus || meta.deliveryChargeStatus || "pending";
      const orderStatus = meta.liveOrderStatus || meta.orderStatus || "Pending";

      const isPendingConfirmation =
        isHomeDelivery &&
        (deliveryChargeStatus === "pending" || !deliveryChargeStatus) &&
        orderStatus === "Pending";

      if (isPendingConfirmation) {
        action.push(item);
      } else {
        confirmed.push(item);
      }
    }

    return { actionRequiredList: action, confirmedList: confirmed };
  }, [notifications]);

  function renderHomeDeliveryCard(item, isActionRequired) {
    const meta = item.meta || {};
    const customerPhone = meta.customerPhone || meta.deliveryAddress?.phone || "";
    const customerName = meta.customerName || "Customer";
    const orderId = meta.orderId ? String(meta.orderId).slice(-6) : "";
    const address = meta.deliveryAddress;
    const mapUrl = getCustomerMapSearchUrl(address);
    const waUrl = getAdminToCustomerWhatsAppUrl({
      customerPhone,
      customerName,
      orderId: meta.orderId
    });

    const deliveryChargeStatus = meta.liveDeliveryChargeStatus || meta.deliveryChargeStatus || "pending";
    const deliveryCharge = meta.liveDeliveryCharge ?? meta.deliveryCharge ?? 0;
    const subtotal = meta.liveSubtotalAmount ?? meta.subtotalAmount ?? 0;
    const totalAmount = meta.liveTotalAmount ?? meta.totalAmount ?? subtotal;
    const orderStatus = meta.liveOrderStatus || meta.orderStatus || "Confirmed";

    return (
      <div
        key={item._id}
        className="panel stack"
        style={{
          borderLeft: isActionRequired ? "5px solid #ef4444" : "5px solid #22c55e",
          background: isActionRequired
            ? (item.read ? "var(--surface)" : "rgba(239, 68, 68, 0.03)")
            : (item.read ? "var(--surface)" : "rgba(34, 197, 94, 0.03)"),
          padding: "18px",
          gap: "12px",
          borderRadius: "8px"
        }}
      >
        {/* Header Banner */}
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div className="row" style={{ gap: "8px", alignItems: "center" }}>
              <span
                style={{
                  background: isActionRequired ? "#fee2e2" : "#dcfce7",
                  color: isActionRequired ? "#b91c1c" : "#15803d",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  letterSpacing: "0.5px"
                }}
              >
                {isActionRequired ? "🔴 ACTION REQUIRED • 🏠 HOME DELIVERY REQUEST" : "🟢 CONFIRMED • 🏠 HOME DELIVERY ORDER"}
              </span>
              {!isActionRequired && (
                <span className={`status status-${(orderStatus || "").toLowerCase().replace(/\s+/g, "-")}`} style={{ fontSize: "0.8rem" }}>
                  {orderStatus}
                </span>
              )}
            </div>
            <h3 style={{ margin: "8px 0 2px" }}>
              Order #{orderId || "N/A"} &mdash; {customerName}
            </h3>
            <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
              Placed {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>

          {!item.read && (
            <button className="ghost-btn" style={{ fontSize: "0.85rem" }} onClick={() => markRead(item._id)}>
              Mark read ✓
            </button>
          )}
        </div>

        {/* Customer & Location Grid */}
        <div className="grid two" style={{ gap: "12px", background: "var(--surface-muted, #f8fafc)", padding: "12px", borderRadius: "6px" }}>
          <div>
            <strong style={{ fontSize: "0.85rem", color: "var(--muted)" }}>👤 CUSTOMER DETAILS</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.95rem" }}>
              <strong>{customerName}</strong>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>
              📞 Phone: <strong>{customerPhone || "N/A"}</strong>
            </p>
          </div>

          <div>
            <strong style={{ fontSize: "0.85rem", color: "var(--muted)" }}>📍 DELIVERY LOCATION</strong>
            {address ? (
              <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
                {address.line1}, {address.city}, {address.state} &mdash; <strong>{address.postalCode}</strong>
              </p>
            ) : (
              <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>Address on file</p>
            )}
          </div>
        </div>

        {/* Order Items & Pricing Breakdown */}
        <div style={{ fontSize: "0.9rem" }}>
          {Array.isArray(meta.items) && meta.items.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <strong>Items Ordered:</strong>{" "}
              {meta.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
            </div>
          )}
          <div className="row" style={{ gap: "16px", flexWrap: "wrap" }}>
            <span>
              Books Subtotal: <strong>{formatINR(subtotal)}</strong>
            </span>
            <span>
              Delivery Charge:{" "}
              {isActionRequired ? (
                <strong style={{ color: "#d97706" }}>TO BE CONFIRMED</strong>
              ) : (
                <strong style={{ color: "#15803d" }}>{formatINR(deliveryCharge)} (Confirmed)</strong>
              )}
            </span>
            {!isActionRequired && (
              <span>
                Total Amount: <strong>{formatINR(totalAmount)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Inline Delivery Fee Control ONLY for Action Required items */}
        {isActionRequired && meta.orderId && (
          <div className="row" style={{ gap: "8px", alignItems: "center", background: "var(--surface)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", flexWrap: "wrap" }}>
            <label htmlFor={`fee-input-${item._id}`} style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>
              Set Delivery Fee: ₹
            </label>
            <input
              id={`fee-input-${item._id}`}
              type="number"
              min="0"
              step="10"
              placeholder="e.g. 50"
              style={{ width: "90px", padding: "6px 8px" }}
              value={deliveryFees[item._id] ?? ""}
              onChange={(e) => setDeliveryFees((prev) => ({ ...prev, [item._id]: e.target.value }))}
            />
            <button
              type="button"
              className="btn"
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
              disabled={savingFee[item._id]}
              onClick={() => confirmDeliveryFeeDirectly(meta.orderId, item._id)}
            >
              {savingFee[item._id] ? "Saving..." : "Confirm & Update Total"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="row" style={{ gap: "10px", flexWrap: "wrap", marginTop: "4px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
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
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>💬</span> WhatsApp Customer
            </a>
          )}

          {customerPhone && (
            <a
              href={`tel:${customerPhone.replace(/\D/g, "")}`}
              className="btn-secondary"
              style={{
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>📞</span> Call Customer
            </a>
          )}

          {meta.orderId ? (
            <Link
              href={`/admin/orders?orderId=${meta.orderId}#order-${meta.orderId}`}
              className="btn-secondary"
              style={{
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>📋</span> View Exact Order
            </Link>
          ) : (
            <Link
              href="/admin/orders"
              className="btn-secondary"
              style={{
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>📋</span> View Orders
            </Link>
          )}

          {address && (
            <>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => copyAddressToClipboard(address)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>📋</span> Copy Address
              </button>

              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ghost-btn"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>📍</span> Open Customer Location in Maps
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthGate role="admin">
      <section>
        <div className="row between" style={{ marginBottom: "16px", alignItems: "center" }}>
          <div>
            <h1>Admin Alerts &amp; Notifications</h1>
            <p className="muted" style={{ margin: 0 }}>
              Live customer action requests, home delivery confirmations, and store reservations.
            </p>
          </div>
          <button className="ghost-btn" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="stack">
            <div className="skeleton skeleton-card" style={{ height: "140px" }} />
            <div className="skeleton skeleton-card" style={{ height: "140px" }} />
          </div>
        ) : !notifications.length ? (
          <div className="panel stack" style={{ textAlign: "center", padding: "40px" }}>
            <h3>No notifications yet</h3>
            <p className="muted">New customer orders and delivery requests will appear here in real-time.</p>
          </div>
        ) : (
          <div className="stack" style={{ gap: "24px" }}>
            {/* Section 1: 🔴 Action Required / Pending Home Deliveries */}
            {actionRequiredList.length > 0 && (
              <div className="stack" style={{ gap: "12px" }}>
                <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                  <h2 style={{ fontSize: "1.2rem", margin: 0 }}>🔴 Action Required</h2>
                  <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 800 }}>
                    {actionRequiredList.length} Pending
                  </span>
                </div>
                <div className="stack" style={{ gap: "14px" }}>
                  {actionRequiredList.map((item) => renderHomeDeliveryCard(item, true))}
                </div>
              </div>
            )}

            {/* Section 2: 🟢 Confirmed Orders & Other Alerts */}
            {confirmedList.length > 0 && (
              <div className="stack" style={{ gap: "12px" }}>
                <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                  <h2 style={{ fontSize: "1.2rem", margin: 0 }}>🟢 Confirmed Orders &amp; Alerts</h2>
                  <span className="badge" style={{ background: "#dcfce7", color: "#15803d", fontWeight: 800 }}>
                    {confirmedList.length} Processed
                  </span>
                </div>
                <div className="stack" style={{ gap: "14px" }}>
                  {confirmedList.map((item) => {
                    const meta = item.meta || {};
                    const isHomeDelivery = item.type === "home_delivery_request" || meta.fulfillmentType === "doorstep";

                    if (isHomeDelivery) {
                      return renderHomeDeliveryCard(item, false);
                    }

                    // Standard notification card (e.g. Store Visit, Status updates)
                    return (
                      <div
                        key={item._id}
                        className="panel row between"
                        style={{
                          padding: "16px",
                          background: item.read ? "var(--surface)" : "rgba(59, 130, 246, 0.03)",
                          borderLeft: item.read ? "1px solid var(--border)" : "4px solid var(--primary)",
                          borderRadius: "8px"
                        }}
                      >
                        <div className="stack" style={{ gap: "4px" }}>
                          <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                            <strong>{item.title}</strong>
                            {!item.read && <span className="badge" style={{ fontSize: "0.75rem" }}>New</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.92rem" }}>{item.message}</p>
                          <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                          {meta.orderId ? (
                            <Link href={`/admin/orders?orderId=${meta.orderId}#order-${meta.orderId}`} className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
                              View Exact Order
                            </Link>
                          ) : (
                            <Link href="/admin/orders" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
                              View Orders
                            </Link>
                          )}
                          {!item.read && (
                            <button className="ghost-btn" onClick={() => markRead(item._id)} style={{ fontSize: "0.85rem" }}>
                              Mark read ✓
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </AuthGate>
  );
}

