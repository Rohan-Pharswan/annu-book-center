"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

const statuses = ["Pending", "Approved", "Rejected", "Cancelled"];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id, status) {
    await fetch(`/api/admin/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await load();
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Manage Bookings</h1>
        <div className="stack">
          {bookings.map((b) => (
            <div key={b._id} className="panel row between">
              <span>
                {b.date} {b.time} ({b.status})
              </span>
              <select value={b.status} onChange={(e) => changeStatus(b._id, e.target.value)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

