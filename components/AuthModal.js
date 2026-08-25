"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Global helper to trigger the Auth Prompt Popup from anywhere in the application.
 *
 * @param {Object} options
 * @param {string} [options.action='cart'] - 'cart' | 'wishlist' | 'review' | 'booking' | 'general'
 * @param {string} [options.title] - Custom modal title
 * @param {string} [options.message] - Custom modal description
 * @param {string} [options.returnUrl] - Specific redirect URL after login
 */
export function triggerAuthModal(options = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-auth-modal", {
        detail: {
          action: options.action || "cart",
          title: options.title || "",
          message: options.message || "",
          returnUrl: options.returnUrl || (window.location.pathname + window.location.search)
        }
      })
    );
  }
}

const ACTION_CONFIG = {
  cart: {
    icon: "🛒",
    badgeLabel: "Shopping Cart",
    defaultTitle: "Sign in to Add to Cart",
    defaultMessage:
      "Please log in or create a free account to add items to your cart, save your selection, and proceed to checkout.",
    perks: [
      "Keep items saved in your cart across all devices",
      "Fast checkout with Doorstep Delivery or Store Pickup",
      "Instant WhatsApp order status & tracking updates"
    ]
  },
  wishlist: {
    icon: "💖",
    badgeLabel: "My Wishlist",
    defaultTitle: "Sign in to Save to Wishlist",
    defaultMessage:
      "Log in to bookmark your favorite books, textbooks, and stationery items to view anytime.",
    perks: [
      "Save your favorite books for later",
      "Get notified about special discounts and stock updates",
      "Easily move wishlist items to your cart with one tap"
    ]
  },
  review: {
    icon: "⭐",
    badgeLabel: "Product Review",
    defaultTitle: "Sign in to Leave a Review",
    defaultMessage:
      "Please sign in to write a verified customer review and share your ratings.",
    perks: [
      "Share your thoughts with the student community",
      "Rate book quality, printing, and edition details",
      "Help fellow readers discover the best titles"
    ]
  },
  booking: {
    icon: "📅",
    badgeLabel: "Store Visit Booking",
    defaultTitle: "Sign in to Schedule a Visit",
    defaultMessage:
      "Please sign in to book your in-store consultation or study session slot.",
    perks: [
      "Reserve dedicated store consultation time",
      "Track your confirmed appointment slots in your profile",
      "Receive automated SMS and WhatsApp confirmation"
    ]
  },
  general: {
    icon: "🔒",
    badgeLabel: "Account Required",
    defaultTitle: "Sign In to Continue",
    defaultMessage:
      "Please log in or create an account to access all features of Annu Book Store.",
    perks: [
      "Access exclusive discounts and seasonal offers",
      "Save multiple delivery addresses for quick orders",
      "Manage past orders and view receipts anytime"
    ]
  }
};

export default function AuthModal() {
  const router = useRouter();
  const auth = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalData, setInternalData] = useState({
    action: "cart",
    title: "",
    message: "",
    returnUrl: ""
  });

  const isOpen = Boolean(auth?.authModalOpen || internalOpen);
  const modalData = auth?.authModalData?.title || auth?.authModalData?.message
    ? auth.authModalData
    : internalData;

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  const closeModal = useCallback(() => {
    if (auth?.closeAuthModal) {
      auth.closeAuthModal();
    }
    setInternalOpen(false);
  }, [auth]);

  const openModal = useCallback((detail = {}) => {
    const action = detail.action && ACTION_CONFIG[detail.action] ? detail.action : "cart";
    setInternalData({
      action,
      title: detail.title || ACTION_CONFIG[action].defaultTitle,
      message: detail.message || ACTION_CONFIG[action].defaultMessage,
      returnUrl: detail.returnUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "")
    });
    setInternalOpen(true);
  }, []);

  useEffect(() => {
    function handleEvent(e) {
      openModal(e.detail || {});
    }

    window.addEventListener("open-auth-modal", handleEvent);
    return () => window.removeEventListener("open-auth-modal", handleEvent);
  }, [openModal]);

  // Lock body scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      // Focus the close button for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        closeModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const currentConfig = ACTION_CONFIG[modalData.action] || ACTION_CONFIG.cart;
  const redirectParam = modalData.returnUrl ? `?redirect=${encodeURIComponent(modalData.returnUrl)}` : "";

  function handleLogin() {
    closeModal();
    router.push(`/login${redirectParam}`);
  }

  function handleSignup() {
    closeModal();
    router.push(`/signup${redirectParam}`);
  }

  return (
    <div
      className="auth-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      role="presentation"
    >
      <div
        className="auth-modal-dialog"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-desc"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          className="auth-modal-close"
          onClick={closeModal}
          aria-label="Close dialog"
        >
          &times;
        </button>

        {/* Modal Header & Icon */}
        <div className="auth-modal-header">
          <div className="auth-modal-icon-wrap" aria-hidden="true">
            <span className="auth-modal-icon">{currentConfig.icon}</span>
          </div>
          <span className="auth-modal-badge">{currentConfig.badgeLabel}</span>
          <h2 id="auth-modal-title" className="auth-modal-title">
            {modalData.title}
          </h2>
          <p id="auth-modal-desc" className="auth-modal-desc">
            {modalData.message}
          </p>
        </div>

        {/* Perks / Benefits List */}
        <div className="auth-modal-perks">
          {currentConfig.perks.map((perk, index) => (
            <div key={index} className="auth-modal-perk-item">
              <span className="auth-modal-perk-check" aria-hidden="true">
                &#10003;
              </span>
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="auth-modal-actions">
          <button
            type="button"
            className="btn auth-modal-btn-primary"
            onClick={handleLogin}
          >
            Log In to Continue &rarr;
          </button>

          <button
            type="button"
            className="btn-secondary auth-modal-btn-secondary"
            onClick={handleSignup}
          >
            Create Free Account
          </button>

          <button
            type="button"
            className="auth-modal-btn-dismiss"
            onClick={closeModal}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
