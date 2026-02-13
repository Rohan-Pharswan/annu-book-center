"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Link from "next/link";
import { formatINR } from "@/lib/currency";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");

  async function loadCart() {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(data.cart || []);
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

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const price = item.product?.finalPrice || item.product?.price || 0;
        return sum + price * item.quantity;
      }, 0),
    [cart]
  );

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
                  <p>{formatINR(item.product?.finalPrice || item.product?.price)}</p>
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
            <h3>Total: {formatINR(total)}</h3>
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
