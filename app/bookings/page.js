"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function BookingPage() {
  const [form, setForm] = useState({ date: "", time: "" });
  const [bookings, setBookings] = useState([]);

  async function loadBookings() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data.bookings || []);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function submit(e) {
    e.preventDefault();
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ date: "", time: "" });
    await loadBookings();
  }

  return (
    <AuthGate>
      <section>
        <h1>Store Visit / Consultation Booking</h1>
        <form onSubmit={submit} className="panel stack">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
          <button className="btn">Book Slot</button>
        </form>

        <div className="stack">
          {bookings.map((booking) => (
            <div key={booking._id} className="panel row between">
              <span>
                {booking.date} at {booking.time}
              </span>
              <span className="status">{booking.status}</span>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

