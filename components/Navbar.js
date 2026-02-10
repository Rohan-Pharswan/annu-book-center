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
          <Link href="/cart">Cart</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/bookings">Bookings</Link>
          {user?.role === "admin" && <Link href="/admin">Admin</Link>}
          {!user ? (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Signup</Link>
            </>
          ) : (
            <>
              <Link href="/profile">Profile</Link>
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

