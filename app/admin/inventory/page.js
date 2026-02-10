"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function AdminInventoryPage() {
  const [threshold, setThreshold] = useState(5);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/admin/low-stock")
      .then((res) => res.json())
      .then((data) => {
        setThreshold(data.threshold || 5);
        setProducts(data.products || []);
      });
  }, []);

  return (
    <AuthGate role="admin">
      <section>
        <h1>Low Stock Alerts</h1>
        <p className="muted">Alert threshold: {threshold}</p>
        <div className="stack">
          {products.map((item) => (
            <div key={item._id} className="panel row between">
              <span>{item.name}</span>
              <span>Stock: {item.stock}</span>
            </div>
          ))}
          {!products.length && <p>No low stock products.</p>}
        </div>
      </section>
    </AuthGate>
  );
}

