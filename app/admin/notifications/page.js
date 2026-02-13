"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    const res = await fetch("/api/admin/notifications?limit=50");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await load();
  }

  async function markAllRead() {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true })
    });
    await load();
  }

  return (
    <AuthGate role="admin">
      <section>
        <div className="row between">
          <h1>Notifications</h1>
          <button className="ghost-btn" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read ({unreadCount})
          </button>
        </div>
        <div className="stack">
          {notifications.map((item) => (
            <div key={item._id} className="panel row between">
              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              {!item.read && (
                <button className="btn" onClick={() => markRead(item._id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
          {!notifications.length && <p className="muted">No notifications yet.</p>}
        </div>
      </section>
    </AuthGate>
  );
}
