"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { formatINR } from "@/lib/currency";

export default function CartPage() {
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

  async function loadCart() {
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
  }

  async function loadProfile() {
    const res = await fetch("/api/profile");
    const data = await res.json();
    setAddresses(data.user?.addresses || []);
    if (data.user?.addresses?.length) setAddressId(data.user.addresses[0]._id);
  }

  useEffect(() => {
    loadCart();
    loadProfile();
  }, []);

  async function updateQuantity(productId, quantity) {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity })
    });
    await loadCart();
  }

  async function removeItem(productId) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId })
    });
    await loadCart();
  }

  async function placeOrder() {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId })
    });
    await loadCart();
  }

  return (
    <AuthGate>
      <section>
        <h1>Cart</h1>
        {!cart.length ? (
          <p>
            Cart is empty. <Link href="/">Browse products</Link>
          </p>
        ) : (
          <div className="stack">
            {cart.map((item) => (
              <div key={item.product?._id || item.product} className="panel row">
                <div>
                  <strong>{item.product?.name}</strong>
                  {Number(item.product?.savings || 0) > 0 ? (
                    <p>
                      <span className="strike">{formatINR(item.product?.originalPrice)}</span>{" "}
                      <strong>{formatINR(item.product?.finalPrice)}</strong>
                    </p>
                  ) : (
                    <p>{formatINR(item.product?.finalPrice || item.product?.price)}</p>
                  )}
                </div>
                <div className="row">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.product?._id || item.product, Number(e.target.value))}
                  />
                  <button className="ghost-btn" onClick={() => removeItem(item.product?._id || item.product)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="panel stack">
              <p>Subtotal: {formatINR(pricing.subtotalAmount)}</p>
              <p>You Saved: {formatINR(pricing.totalSavings)}</p>
              <p>Delivery (COD): {formatINR(pricing.deliveryCharge)}</p>
              <h3>Total: {formatINR(pricing.totalAmount)}</h3>
            </div>
            <div className="panel">
              <h3>Checkout (Cash on Delivery)</h3>
              <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                {addresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.label} - {a.line1}, {a.city}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={placeOrder} disabled={!addressId}>
                Place Order
              </button>
            </div>
          </div>
        )}
      </section>
    </AuthGate>
  );
}
