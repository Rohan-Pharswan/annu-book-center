"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/ToastProvider";

export default function BookingPage() {
  const [form, setForm] = useState({ date: "", time: "" });
  const [bookings, setBookings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function loadBookings() {
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast.error("Failed to load bookings");
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to book slot");
        return;
      }
      toast.success("Store visit slot booked!");
      setForm({ date: "", time: "" });
      await loadBookings();
    } catch {
      toast.error("Failed to book slot");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <AuthGate>
      <section className="stack" style={{ gap: "24px" }}>

        <div>
          <h1>Store Visit & Consultation Booking</h1>
          <p className="muted">Book an in-store appointment with our educational specialists for personalized book recommendations.</p>
        </div>

        <form onSubmit={submit} className="panel stack" aria-label="Book appointment slot">
          <h3>Schedule a Visit</h3>
          <div className="grid two">
            <div>
              <label htmlFor="booking-date">Preferred Date</label>
              <input
                id="booking-date"
                type="date"
                value={form.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="booking-time">Preferred Time Slot</label>
              <input
                id="booking-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
          </div>
          <button className="btn" style={{ alignSelf: "flex-start" }} disabled={submitting}>
            {submitting ? "Booking Slot..." : "Confirm Booking"}
          </button>
        </form>

        <div className="stack">
          <h2>My Bookings ({bookings.length})</h2>
          {bookings.length > 0 ? (
            <div className="stack">
              {bookings.map((booking) => {
                const statusClass = `status status-${(booking.status || "").toLowerCase()}`;
                return (
                  <div key={booking._id} className="panel row between" style={{ padding: "16px" }}>
                    <div>
                      <strong>Visit on {booking.date}</strong> at {booking.time}
                      <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>
                        Booking ID: #{booking._id.slice(-6)}
                      </p>
                    </div>
                    <span className={statusClass}>{booking.status}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">You have no active bookings scheduled.</p>
          )}
        </div>
      </section>
    </AuthGate>
  );
}


