"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
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
        <nav className="menu">
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
            <Link href="/admin" className={`nav-link${pathname.startsWith("/admin") ? " is-active" : ""}`}>
              Admin
            </Link>
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
