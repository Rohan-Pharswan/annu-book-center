"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser, checkAuth } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuToggleRef = useRef(null);
  const drawerRef = useRef(null);

  const loadCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        const count = (data.cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  }, []);

  const loadWishlistCount = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setWishlistCount((data.wishlist || []).length);
      } else {
        setWishlistCount(0);
      }
    } catch {
      setWishlistCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=1");
      if (res.ok) {
        const payload = await res.json();
        setUnreadNotifications(payload.unreadCount || 0);
      }
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCartCount();
      loadWishlistCount();
      if (user.role === "admin") {
        loadNotifications();
      } else {
        setUnreadNotifications(0);
      }
    } else {
      setCartCount(0);
      setWishlistCount(0);
      setUnreadNotifications(0);
    }
  }, [user, loadCartCount, loadWishlistCount, loadNotifications]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
    return () => {
      document.body.classList.remove("drawer-open");
    };
  }, [drawerOpen]);

  // Escape key & focus management for accessible mobile drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (!drawerOpen) return;
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuToggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Event listeners for state sync
  useEffect(() => {
    function handleCartUpdate() {
      loadCartCount();
    }
    function handleWishlistUpdate() {
      loadWishlistCount();
    }
    function handleAuthChange() {
      checkAuth();
    }

    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("wishlist-updated", handleWishlistUpdate);
    window.addEventListener("auth-changed", handleAuthChange);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (user?.role === "admin") {
        loadNotifications();
      }
    }, 30000);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("wishlist-updated", handleWishlistUpdate);
      window.removeEventListener("auth-changed", handleAuthChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [loadCartCount, loadWishlistCount, checkAuth, user?.role, loadNotifications]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setCartCount(0);
      setWishlistCount(0);
      setUnreadNotifications(0);
      setDrawerOpen(false);
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
      window.dispatchEvent(new CustomEvent("auth-changed"));
    } catch {
      toast.error("Logout failed");
    }
  }

  return (
    <header className="nav-wrap">
      <div className="container nav">
        <Link href="/" className="brand" aria-label="Annu Book Store Home">
          <span>📚</span> Annu Book Store
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-menu" aria-label="Main Navigation">
          <Link href="/products" className={`nav-link${pathname === "/products" ? " is-active" : ""}`}>
            Products
          </Link>
          <Link href="/cart" className={`nav-link${pathname === "/cart" ? " is-active" : ""}`}>
            Cart
            {cartCount > 0 && <span className="nav-badge" aria-label={`${cartCount} items in cart`}>{cartCount}</span>}
          </Link>
          <Link href="/wishlist" className={`nav-link${pathname === "/wishlist" ? " is-active" : ""}`}>
            Wishlist
            {wishlistCount > 0 && <span className="nav-badge" aria-label={`${wishlistCount} items in wishlist`}>{wishlistCount}</span>}
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
                Alerts
                {unreadNotifications > 0 && (
                  <span className="nav-badge" aria-label={`${unreadNotifications} unread alerts`}>
                    {unreadNotifications}
                  </span>
                )}
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
              <button onClick={logout} className="ghost-btn" style={{ color: "#cbd5e1" }}>
                Logout
              </button>
            </>
          )}
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button
          ref={menuToggleRef}
          className="menu-toggle"
          aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setDrawerOpen((prev) => !prev)}
        >
          <span aria-hidden="true">{drawerOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      <div
        className={`drawer-backdrop${drawerOpen ? " is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="mobile-nav-drawer"
        ref={drawerRef}
        className={`mobile-drawer${drawerOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-header">
          <span className="drawer-title">Menu</span>
          <button
            className="drawer-close"
            onClick={() => {
              setDrawerOpen(false);
              menuToggleRef.current?.focus();
            }}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Mobile Navigation">
          <Link href="/products" className={`nav-link${pathname === "/products" ? " is-active" : ""}`}>
            <span>All Products</span>
          </Link>
          <Link href="/cart" className={`nav-link${pathname === "/cart" ? " is-active" : ""}`}>
            <span>Cart</span>
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </Link>
          <Link href="/wishlist" className={`nav-link${pathname === "/wishlist" ? " is-active" : ""}`}>
            <span>Wishlist</span>
            {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
          </Link>
          <Link href="/orders" className={`nav-link${pathname === "/orders" ? " is-active" : ""}`}>
            <span>My Orders</span>
          </Link>
          <Link href="/bookings" className={`nav-link${pathname === "/bookings" ? " is-active" : ""}`}>
            <span>Store Visit Booking</span>
          </Link>

          {user?.role === "admin" && (
            <>
              <div style={{ height: "1px", background: "#1e293b", margin: "8px 0" }} />
              <Link
                href="/admin"
                className={`nav-link${pathname.startsWith("/admin") && pathname !== "/admin/notifications" ? " is-active" : ""}`}
              >
                <span>Admin Dashboard</span>
              </Link>
              <Link
                href="/admin/notifications"
                className={`nav-link${pathname === "/admin/notifications" ? " is-active" : ""}`}
              >
                <span>Admin Alerts</span>
                {unreadNotifications > 0 && <span className="nav-badge">{unreadNotifications}</span>}
              </Link>
            </>
          )}

          <div style={{ height: "1px", background: "#1e293b", margin: "8px 0" }} />

          {!user ? (
            <>
              <Link href="/login" className={`nav-link${pathname === "/login" ? " is-active" : ""}`}>
                <span>Login</span>
              </Link>
              <Link href="/signup" className={`nav-link${pathname === "/signup" ? " is-active" : ""}`}>
                <span>Create Account</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className={`nav-link${pathname === "/profile" ? " is-active" : ""}`}>
                <span>My Profile</span>
              </Link>
              <button
                onClick={logout}
                className="btn-danger"
                style={{ width: "100%", marginTop: "8px" }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </aside>
    </header>
  );
}
