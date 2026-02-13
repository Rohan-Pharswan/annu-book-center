"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const currentUser = data?.user || null;
        setUser(currentUser);

        if (currentUser?.role === "admin") {
          const res = await fetch("/api/admin/notifications?limit=1");
          if (res.ok) {
            const payload = await res.json();
            setUnreadNotifications(payload.unreadCount || 0);
          }
        } else {
          setUnreadNotifications(0);
        }
      })
      .catch(() => {
        setUser(null);
        setUnreadNotifications(0);
      });
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="nav-wrap">
      <div className="container nav">
        <Link href="/" className="brand">
          Annu Book Store
        </Link>
        <button
          className="ghost-btn menu-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
        <nav id="main-nav" className={`menu${menuOpen ? " is-open" : ""}`}>
          <Link href="/cart" className={`nav-link${pathname === "/cart" ? " is-active" : ""}`}>
            Cart
          </Link>
          <Link href="/wishlist" className={`nav-link${pathname === "/wishlist" ? " is-active" : ""}`}>
            Wishlist
          </Link>
          <Link href="/orders" className={`nav-link${pathname === "/orders" ? " is-active" : ""}`}>
            Orders
          </Link>
          <Link href="/bookings" className={`nav-link${pathname === "/bookings" ? " is-active" : ""}`}>
            Bookings
          </Link>
          {user?.role === "admin" && (
            <>
              <Link
                href="/admin"
                className={`nav-link${pathname.startsWith("/admin") && pathname !== "/admin/notifications" ? " is-active" : ""}`}
              >
                Admin
              </Link>
              <Link
                href="/admin/notifications"
                className={`nav-link${pathname === "/admin/notifications" ? " is-active" : ""}`}
              >
                Alerts {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
              </Link>
            </>
          )}
          {!user ? (
            <>
              <Link href="/login" className={`nav-link${pathname === "/login" ? " is-active" : ""}`}>
                Login
              </Link>
              <Link href="/signup" className={`nav-link${pathname === "/signup" ? " is-active" : ""}`}>
                Signup
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className={`nav-link${pathname === "/profile" ? " is-active" : ""}`}>
                Profile
              </Link>
              <button onClick={logout} className="ghost-btn">
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
