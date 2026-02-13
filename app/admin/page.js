import Link from "next/link";
import AuthGate from "@/components/AuthGate";

export default function AdminHomePage() {
  return (
    <AuthGate role="admin">
      <section>
        <h1>Admin Panel</h1>
        <div className="grid two">
          <Link className="panel" href="/admin/products">
            Product Management
          </Link>
          <Link className="panel" href="/admin/categories">
            Categories
          </Link>
          <Link className="panel" href="/admin/inventory">
            Inventory Alerts
          </Link>
          <Link className="panel" href="/admin/orders">
            Orders
          </Link>
          <Link className="panel" href="/admin/notifications">
            Notifications
          </Link>
          <Link className="panel" href="/admin/users">
            Users
          </Link>
          <Link className="panel" href="/admin/bookings">
            Bookings
          </Link>
          <Link className="panel" href="/admin/discounts">
            Discounts
          </Link>
          <Link className="panel" href="/admin/reviews">
            Reviews
          </Link>
        </div>
      </section>
    </AuthGate>
  );
}
