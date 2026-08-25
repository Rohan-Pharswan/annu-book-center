"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { triggerAuthModal } from "@/components/AuthModal";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      show: (msg, type) => console.log(`[Toast ${type || "info"}]: ${msg}`),
      success: (msg) => console.log(`[Toast success]: ${msg}`),
      error: (msg) => console.log(`[Toast error]: ${msg}`),
      info: (msg) => console.log(`[Toast info]: ${msg}`)
    };
  }
  return context;
}

// Global dispatcher helper that can be called anywhere in browser
export function triggerToast(message, type = "info", duration = 3500) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app-toast", {
        detail: { message, type, duration }
      })
    );
  }
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", duration = 3500) => {
      // Intercept any unhandled auth error messages and open the login popup instead
      const msgLower = String(message || "").toLowerCase().trim();
      if (
        msgLower === "unauthorized" ||
        msgLower === "invalid session" ||
        msgLower === "invalid token"
      ) {
        triggerAuthModal({ action: "cart" });
        return null;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast = { id, message, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback((msg, duration) => show(msg, "success", duration), [show]);
  const error = useCallback((msg, duration) => show(msg, "error", duration), [show]);
  const info = useCallback((msg, duration) => show(msg, "info", duration), [show]);

  useEffect(() => {
    function handleCustomEvent(e) {
      if (e.detail?.message) {
        show(e.detail.message, e.detail.type || "info", e.detail.duration);
      }
    }
    window.addEventListener("app-toast", handleCustomEvent);
    return () => window.removeEventListener("app-toast", handleCustomEvent);
  }, [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, removeToast }}>
      {children}
      <div
        className="toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            role="status"
          >
            <span className="toast-icon">
              {toast.type === "success" && "\u2713"}
              {toast.type === "error" && "\u2715"}
              {toast.type === "info" && "\u2139"}
            </span>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
