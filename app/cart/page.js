"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/components/ToastProvider";

const emptyAddress = { label: "Home", line1: "", city: "", state: "", postalCode: "", phone: "" };

export default function CartPage() {
  const router = useRouter();
  const toast = useToast();
  const [cart, setCart] = useState([]);
  const [pricing, setPricing] = useState({
    subtotalAmount: 0,
    discountedSubtotal: 0,
    totalSavings: 0,
    deliveryCharge: 100,
    totalAmount: 0
  });
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [addressSubmitting, setAddressSubmitting] = useState(false);

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
    if (!addressId) {
      toast.error("Please select or add a delivery address first.");
      return;
    }
    setIsSubmitting(true);
    setOrderError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || "Failed to place order. Please try again.";
        setOrderError(errMsg);
        toast.error(errMsg);
        return;
      }
      toast.success("Order placed successfully! (#" + String(data.order?._id).slice(-6) + ")");
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
        <h1>Cart</h1>
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
                  <span>{formatINR(pricing.subtotalAmount)}</span>
                </div>
                {pricing.totalSavings > 0 && (
                  <div className="row between" style={{ color: "var(--success)", fontWeight: 600 }}>
                    <span>Total Savings:</span>
                    <span>-{formatINR(pricing.totalSavings)}</span>
                  </div>
                )}
                <div className="row between">
                  <span className="muted">Delivery Fee (COD):</span>
                  <span>{formatINR(pricing.deliveryCharge)}</span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />
                <div className="row between" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                  <span>Total Amount:</span>
                  <span>{formatINR(pricing.totalAmount)}</span>
                </div>
              </div>

            <div className="panel stack">
              <h3>Checkout (Cash on Delivery)</h3>
              <label>Select Delivery Address</label>
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

              {orderError && <p className="error">{orderError}</p>}
              <button className="btn" onClick={placeOrder} disabled={!addressId || isSubmitting}>
                {isSubmitting ? "Placing Order..." : "Place Order (Cash on Delivery)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  </AuthGate>
);
}


