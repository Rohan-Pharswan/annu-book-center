"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { triggerAuthModal } from "@/components/AuthModal";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalData, setAuthModalData] = useState({
    action: "cart",
    title: "",
    message: "",
    returnUrl: ""
  });

  const userRef = useRef(null);
  userRef.current = user;

  const openAuthModal = useCallback((options = {}) => {
    setAuthModalData({
      action: options.action || "cart",
      title: options.title || "",
      message: options.message || "",
      returnUrl: options.returnUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "")
    });
    setAuthModalOpen(true);
    // Also dispatch event for any external listeners
    triggerAuthModal(options);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const data = await res.json();
        const currentUser = data?.user || null;
        setUser(currentUser);
        return { isAuthenticated: Boolean(currentUser?._id || currentUser?.id), user: currentUser };
      } else {
        setUser(null);
        return { isAuthenticated: false, user: null };
      }
    } catch {
      setUser(null);
      return { isAuthenticated: false, user: null };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    function handleAuthChange() {
      checkAuth();
    }
    window.addEventListener("auth-changed", handleAuthChange);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkAuth]);

  /**
   * Pre-check authentication BEFORE executing any protected action.
   * If logged out: opens AuthModal immediately and returns false.
   * If logged in: returns true.
   *
   * @param {string} [action='cart'] - 'cart' | 'wishlist' | 'review' | 'booking' | 'general'
   * @param {Object} [customOptions] - Optional overrides for title, message, returnUrl
   * @returns {Promise<boolean>}
   */
  const ensureAuthenticated = useCallback(
    async (action = "cart", customOptions = {}) => {
      // If we already know the user is null and not loading, trigger popup immediately
      if (!loading && !userRef.current) {
        openAuthModal({ action, ...customOptions });
        return false;
      }

      // If loading or uncertain, do a fast live check
      const { isAuthenticated } = await checkAuth();
      if (!isAuthenticated) {
        openAuthModal({ action, ...customOptions });
        return false;
      }

      return true;
    },
    [loading, checkAuth, openAuthModal]
  );

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: Boolean(user?._id || user?.id),
    checkAuth,
    ensureAuthenticated,
    authModalOpen,
    authModalData,
    openAuthModal,
    closeAuthModal
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
