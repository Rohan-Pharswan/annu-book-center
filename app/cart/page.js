"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";
import ContactStore from "@/components/ContactStore";
import { STORE_CONFIG } from "@/lib/storeConfig";

const emptyAddress = { label: "Home", line1: "", city: "", state: "", postalCode: "", phone: "" };

export default function CartPage() {
  const router = useRouter();
  const toast = useToast();
  const [cart, setCart] = useState([]);
  const [pricing, setPricing] = useState({
    subtotalAmount: 0,
    discountedSubtotal: 0,
    totalSavings: 0,
    deliveryCharge: 0,
    totalAmount: 0
  });
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  const [fulfillmentType, setFulfillmentType] = useState("doorstep"); // "doorstep" | "store_visit"
  const [visitDate, setVisitDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [visitTime, setVisitTime] = useState("10:00 AM - 1:00 PM");
  const [storeVisitPhone, setStoreVisitPhone] = useState("");

  const activeDeliveryFee = 0;
  const activeTotalAmount = Number(pricing.discountedSubtotal.toFixed(2));

  async function loadCart() {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCart(data.cart || []);
      setPricing(
        data.pricing || {
          subtotalAmount: 0,
          discountedSubtotal: 0,
          totalSavings: 0,
          deliveryCharge: 100,
          totalAmount: 0
        }
      );
    } catch {
      toast.error("Failed to load cart");
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      const userAddresses = data.user?.addresses || [];
      setAddresses(userAddresses);
      if (userAddresses.length && !addressId) {
        setAddressId(userAddresses[0]._id);
      }
      if (data.user?.phone && !storeVisitPhone) {
        setStoreVisitPhone(data.user.phone);
      }
    } catch {
      // Profile load fallback
    }
  }

  useEffect(() => {
    loadCart();
    loadProfile();
  }, []);

  async function updateQuantity(productId, quantity) {
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity })
      });
      if (res.ok) {
        toast.info("Cart updated");
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error("Failed to update quantity");
      }
      await loadCart();
    } catch {
      toast.error("Failed to update quantity");
    }
  }

  async function removeItem(productId) {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        toast.info("Item removed from cart");
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error("Failed to remove item");
      }
      await loadCart();
    } catch {
      toast.error("Failed to remove item");
    }
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    if (addresses.length >= 10) {
      toast.error("Maximum of 10 addresses reached. Please manage them in your profile.");
      return;
    }
    setAddressSubmitting(true);
    try {
      const updatedAddresses = [...addresses, newAddress];
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: updatedAddresses })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add address");
        return;
      }
      const savedAddresses = data.user?.addresses || [];
      setAddresses(savedAddresses);
      const newlyCreated = savedAddresses[savedAddresses.length - 1];
      if (newlyCreated?._id) {
        setAddressId(newlyCreated._id);
      }
      setNewAddress(emptyAddress);
      setShowAddAddress(false);
      toast.success("Delivery address added!");
    } catch {
      toast.error("Failed to add address");
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function placeOrder() {
    if (isSubmitting) return;
    if (fulfillmentType === "doorstep" && !addressId) {
      toast.error("Please select or add a delivery address for doorstep delivery.");
      return;
    }
    if (fulfillmentType === "store_visit" && !visitDate) {
      toast.error("Please select a planned date for your store visit.");
      return;
    }

    setIsSubmitting(true);
    setOrderError("");
    try {
      const payload = {
        fulfillmentType,
        addressId: fulfillmentType === "doorstep" ? addressId : undefined,
        visitDate: fulfillmentType === "store_visit" ? visitDate : undefined,
        visitTime: fulfillmentType === "store_visit" ? visitTime : undefined,
        customerPhone: storeVisitPhone || undefined
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Failed to place order. Please try again.";
        setOrderError(errMsg);
        toast.error(errMsg);
        return;
      }
      const orderNumber = String(data.order?._id).slice(-6);
      if (fulfillmentType === "store_visit") {
        toast.success(`Store visit & reservation booked! (#${orderNumber})`);
      } else {
        toast.success(`Doorstep order placed successfully! (#${orderNumber})`);
      }
      window.dispatchEvent(new CustomEvent("cart-updated"));
      await loadCart();
      router.push("/orders");
    } catch {
      toast.error("An unexpected error occurred while placing order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <section>
        <h1>Cart & Checkout</h1>
        {!cart.length ? (
          <div className="panel stack" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3>Your cart is currently empty</h3>
            <p className="muted">Explore our catalog and add books, stationery, or supplies to your cart.</p>
            <Link href="/products" className="btn" style={{ alignSelf: "center", marginTop: "8px" }}>
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid detail">
            <div className="stack">
              <h2>Cart Items ({cart.length})</h2>
              {cart.map((item) => (
                <div key={item.product?._id || item.product} className="panel row between" style={{ padding: "16px" }}>
                  <div className="row" style={{ gap: "16px" }}>
                    {item.product?.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "var(--radius)" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          borderRadius: "var(--radius)",
                          backgroundColor: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem"
                        }}
                      >
                        📚
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: "0 0 4px" }}>
                        <Link href={`/products/${item.product?._id}`} style={{ color: "inherit" }}>
                          {item.product?.name}
                        </Link>
                      </h4>
                      {Number(item.product?.savings || 0) > 0 ? (
                        <p style={{ margin: 0 }}>
                          <span className="strike">{formatINR(item.product?.originalPrice)}</span>{" "}
                          <strong>{formatINR(item.product?.finalPrice)}</strong>{" "}
                          <span className="muted" style={{ fontSize: "0.82rem" }}>(Save {formatINR(item.product?.savings)})</span>
                        </p>
                      ) : (
                        <p style={{ margin: 0 }}>
                          <strong>{formatINR(item.product?.finalPrice || item.product?.price)}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="row" style={{ gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label htmlFor={`qty-${item.product?._id}`} style={{ fontSize: "0.85rem", margin: 0 }}>
                        Qty:
                      </label>
                      <input
                        id={`qty-${item.product?._id}`}
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        style={{ width: "68px", padding: "6px 8px", minHeight: "38px" }}
                        onChange={(e) => updateQuantity(item.product?._id || item.product, Number(e.target.value))}
                      />
                    </div>
                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ color: "var(--danger)", padding: "6px 12px", minHeight: "38px" }}
                      onClick={() => removeItem(item.product?._id || item.product)}
                      aria-label={`Remove ${item.product?.name} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="stack">
              <h2>Order Summary</h2>
              <div className="panel stack">
                <div className="row between">
                  <span className="muted">Items Subtotal:</span>
                  <span>{formatINR(pricing.discountedSubtotal)}</span>
                </div>
                {pricing.totalSavings > 0 && (
                  <div className="row between" style={{ color: "var(--success)", fontWeight: 600 }}>
                    <span>Total Discount Savings:</span>
                    <span>-{formatINR(pricing.totalSavings)}</span>
                  </div>
                )}
                <div className="row between">
                  <span className="muted">
                    {fulfillmentType === "store_visit" ? "Delivery Fee (Store Pickup):" : "Delivery Charge (Home Delivery):"}
                  </span>
                  <span>
                    {fulfillmentType === "store_visit" ? (
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>FREE (₹0)</span>
                    ) : (
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>To be confirmed</span>
                    )}
                  </span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
                <div className="row between" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  <span>{fulfillmentType === "doorstep" ? "Books Subtotal (Payable):" : "Total Amount:"}</span>
                  <span>{formatINR(activeTotalAmount)}</span>
                </div>
                {fulfillmentType === "doorstep" && (
                  <p className="muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
                    * Delivery charges will be confirmed with Annu Book Center based on your location.
                  </p>
                )}
              </div>

              <div className="panel stack">
                <h3>Choose Fulfillment Method</h3>
                <div className="grid two" style={{ gap: "12px" }}>
                  <div
                    className="card"
                    style={{
                      padding: "14px",
                      cursor: "pointer",
                      border: fulfillmentType === "doorstep" ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: fulfillmentType === "doorstep" ? "rgba(59, 130, 246, 0.05)" : "var(--surface)",
                      borderRadius: "8px"
                    }}
                    onClick={() => setFulfillmentType("doorstep")}
                  >
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <input
                        type="radio"
                        id="fulfill-doorstep"
                        name="fulfillmentType"
                        checked={fulfillmentType === "doorstep"}
                        onChange={() => setFulfillmentType("doorstep")}
                      />
                      <label htmlFor="fulfill-doorstep" style={{ fontWeight: 700, cursor: "pointer", margin: 0 }}>
                        🏠 Home Delivery
                      </label>
                    </div>
                    <p className="muted" style={{ fontSize: "0.82rem", margin: "6px 0 0 24px" }}>
                      Delivery to your address. Delivery fee is <strong>To be confirmed</strong> based on location.
                    </p>
                  </div>

                  <div
                    className="card"
                    style={{
                      padding: "14px",
                      cursor: "pointer",
                      border: fulfillmentType === "store_visit" ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: fulfillmentType === "store_visit" ? "rgba(59, 130, 246, 0.05)" : "var(--surface)",
                      borderRadius: "8px"
                    }}
                    onClick={() => setFulfillmentType("store_visit")}
                  >
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <input
                        type="radio"
                        id="fulfill-store"
                        name="fulfillmentType"
                        checked={fulfillmentType === "store_visit"}
                        onChange={() => setFulfillmentType("store_visit")}
                      />
                      <label htmlFor="fulfill-store" style={{ fontWeight: 700, cursor: "pointer", margin: 0 }}>
                        🏬 Store Pickup
                      </label>
                    </div>
                    <p className="muted" style={{ fontSize: "0.82rem", margin: "6px 0 0 24px" }}>
                      Reserve books & pickup directly at store (<strong>FREE / ₹0 delivery fee</strong>).
                    </p>
                  </div>
                </div>

                {fulfillmentType === "doorstep" ? (
                  <div className="stack" style={{ marginTop: "12px" }}>
                    <div className="panel stack" style={{ background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px" }}>
                      <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "var(--primary)" }}>
                        ℹ️ Home Delivery Notice: Delivery charges depend on your delivery location. Please contact Annu Book Center on WhatsApp/Phone after submitting to confirm your delivery charge.
                      </p>
                    </div>

                    <label style={{ marginTop: "6px" }}>Select Delivery Address</label>
                    {addresses.length > 0 ? (
                      <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                        {addresses.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.label} &mdash; {a.line1}, {a.city}, {a.state} ({a.phone})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="muted">No delivery address saved yet. Please add one below.</p>
                    )}

                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => setShowAddAddress((prev) => !prev)}
                    >
                      {showAddAddress ? "Cancel New Address" : "+ Add New Delivery Address"}
                    </button>

                    {showAddAddress && (
                      <form onSubmit={handleAddAddress} className="inline-address-form stack">
                        <h4>New Delivery Address</h4>
                        <div className="grid two">
                          <input
                            placeholder="Label (e.g. Home, Work)"
                            value={newAddress?.label || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                            required
                          />
                          <input
                            placeholder="Phone (e.g. 9876543210)"
                            value={newAddress?.phone || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                            required
                          />
                          <input
                            placeholder="Street / Flat / Line 1"
                            value={newAddress?.line1 || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                            required
                          />
                          <input
                            placeholder="City"
                            value={newAddress?.city || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                            required
                          />
                          <input
                            placeholder="State"
                            value={newAddress?.state || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                            required
                          />
                          <input
                            placeholder="Postal / PIN Code"
                            value={newAddress?.postalCode || ""}
                            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                            required
                          />
                        </div>

                        <button className="btn" style={{ alignSelf: "flex-start" }} disabled={addressSubmitting}>
                          {addressSubmitting ? "Saving Address..." : "Save & Use Address"}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="panel stack" style={{ marginTop: "12px", background: "var(--surface-muted, rgba(0,0,0,0.02))" }}>
                    <div className="row" style={{ gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "1.2rem" }}>📍</span>
                      <div>
                        <strong>Store Location: {STORE_CONFIG.name}</strong>
                        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                          {STORE_CONFIG.address} &bull; Timings: {STORE_CONFIG.timings}
                        </p>
                      </div>
                    </div>

                    <div className="grid two" style={{ marginTop: "8px" }}>
                      <div>
                        <label htmlFor="visit-date" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Planned Visit Date</label>
                        <input
                          id="visit-date"
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="visit-time" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Preferred Time Slot</label>
                        <select id="visit-time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)}>
                          <option value="Morning (10:00 AM - 1:00 PM)">Morning (10:00 AM - 1:00 PM)</option>
                          <option value="Afternoon (1:00 PM - 4:00 PM)">Afternoon (1:00 PM - 4:00 PM)</option>
                          <option value="Evening (4:00 PM - 8:00 PM)">Evening (4:00 PM - 8:00 PM)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-phone" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Contact Phone (for reservation confirmation)</label>
                      <input
                        id="contact-phone"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={storeVisitPhone}
                        onChange={(e) => setStoreVisitPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {orderError && <p className="error">{orderError}</p>}
                <button
                  className="btn"
                  style={{ marginTop: "10px" }}
                  onClick={placeOrder}
                  disabled={isSubmitting || (fulfillmentType === "doorstep" && !addressId)}
                >
                  {isSubmitting
                    ? "Processing..."
                    : fulfillmentType === "store_visit"
                    ? `Reserve & Book Store Pickup (${formatINR(activeTotalAmount)})`
                    : `Request Home Delivery (${formatINR(activeTotalAmount)})`}
                </button>
              </div>

              {/* Centralized Store Contact Helper Box */}
              <ContactStore title="Have Questions About Books or Delivery?" subtitle="Contact Annu Book Center directly on WhatsApp or Call" />
            </div>
          </div>
        )}
      </section>
    </AuthGate>
  );
}


