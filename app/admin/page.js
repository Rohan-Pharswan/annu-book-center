import Link from "next/link";
import AuthGate from "@/components/AuthGate";

export default function AdminHomePage() {
  const adminModules = [
    { title: "Product Management", href: "/admin/products", icon: "📦", desc: "Add, edit, inventory & product-level discounts" },
    { title: "Categories", href: "/admin/categories", icon: "🏷️", desc: "Manage store catalog categories & tags" },
    { title: "Orders Management", href: "/admin/orders", icon: "📋", desc: "View customer orders, verify contacts & update fulfillment" },
    { title: "Discounts & Offers", href: "/admin/discounts", icon: "🎟️", desc: "Configure flat or percentage store discounts" },
    { title: "Inventory Alerts", href: "/admin/inventory", icon: "⚠️", desc: "Monitor low-stock items requiring restocking" },
    { title: "Admin Alerts", href: "/admin/notifications", icon: "🔔", desc: "System alerts, customer orders & booking notices" },
    { title: "Bookings", href: "/admin/bookings", icon: "📅", desc: "Manage in-store consultation requests" },
    { title: "Customer Reviews", href: "/admin/reviews", icon: "⭐", desc: "Moderate customer ratings and review comments" },
    { title: "Registered Users", href: "/admin/users", icon: "👥", desc: "View customer accounts & roles" }
  ];

  return (
    <AuthGate role="admin">
      <section className="stack" style={{ gap: "24px" }}>
        <div>
          <h1>Store Administration</h1>
          <p className="muted">Manage catalog products, orders, inventory, promotions, and customer relations.</p>
        </div>

        <div className="grid three">
          {adminModules.map((m) => (
            <Link key={m.href} className="card" href={m.href} style={{ padding: "20px", textDecoration: "none" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>{m.icon}</div>
              <h3 style={{ margin: "0 0 6px", color: "var(--text)" }}>{m.title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

