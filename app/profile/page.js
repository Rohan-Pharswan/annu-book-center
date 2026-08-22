"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/ToastProvider";


const emptyAddress = { label: "Home", line1: "", city: "", state: "", postalCode: "", phone: "" };

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setUser(data.user);
      setName(data.user?.name || "");
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveName() {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile saved successfully");
      await loadProfile();
    } catch {
      toast.error("Failed to update profile");
    }
  }

  async function addAddress() {
    if ((user?.addresses || []).length >= 10) {
      toast.error("Maximum 10 addresses allowed");
      return;
    }
    try {
      const addresses = [...(user?.addresses || []), address];
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add address");
        return;
      }
      setAddress(emptyAddress);
      toast.success("Address added successfully");
      await loadProfile();
    } catch {
      toast.error("Failed to add address");
    }
  }

  async function deleteAddress(addressId, label) {
    const confirmed = window.confirm(`Are you sure you want to delete "${label || "this address"}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/profile/address/${addressId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete address");
        return;
      }
      toast.info("Address removed");
      await loadProfile();
    } catch {
      toast.error("Failed to delete address");
    }
  }

  return (
    <AuthGate>
      <section className="stack" style={{ gap: "24px" }}>
        <h1>My Profile</h1>

        {loading ? (
          <div className="stack" aria-busy="true" aria-label="Loading profile">
            <div className="skeleton" style={{ height: "140px" }} />
            <div className="skeleton" style={{ height: "200px" }} />
          </div>
        ) : (
          <>
            <div className="panel stack">
              <h3>Personal Information</h3>
              <div>
                <label htmlFor="profile-name">Full Name</label>
                <div className="row" style={{ gap: "10px" }}>
                  <input
                    id="profile-name"
                    value={name || ""}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ maxWidth: "360px" }}
                  />

                  <button className="btn" onClick={saveName}>
                    Save Changes
                  </button>
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Account Email: <strong>{user?.email}</strong> (Role: {user?.role || "customer"})
              </p>
            </div>

            <div className="stack">
              <div className="row between">
                <h2>Saved Delivery Addresses ({user?.addresses?.length || 0}/10)</h2>
              </div>

              {user?.addresses?.length > 0 ? (
                <div className="grid two">
                  {user.addresses.map((a) => (
                    <div key={a._id} className="panel stack" style={{ padding: "16px" }}>
                      <div className="row between">
                        <span className="discount-badge" style={{ textTransform: "uppercase" }}>{a.label}</span>
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ color: "var(--danger)", padding: "4px 8px", minHeight: "32px" }}
                          onClick={() => deleteAddress(a._id, a.label)}
                          aria-label={`Delete ${a.label} address`}
                        >
                          Delete
                        </button>
                      </div>
                      <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{a.line1}</p>
                      <p className="muted" style={{ margin: 0 }}>
                        {a.city}, {a.state} - {a.postalCode}
                      </p>
                      <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                        Phone: {a.phone}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No delivery addresses saved yet. Add one below to use during checkout.</p>
              )}
            </div>

            <div className="panel stack">
              <h3>Add New Delivery Address</h3>
              <form onSubmit={(e) => { e.preventDefault(); addAddress(); }} className="stack">
                <div className="grid two">
                  <div>
                    <label htmlFor="new-label">Address Label</label>
                    <input
                      id="new-label"
                      placeholder="e.g. Home, Office"
                      value={address?.label || ""}
                      onChange={(e) => setAddress({ ...address, label: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-phone">Contact Phone</label>
                    <input
                      id="new-phone"
                      placeholder="10-digit mobile number"
                      value={address?.phone || ""}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-line1">Address Line 1</label>
                    <input
                      id="new-line1"
                      placeholder="House/Flat No, Street"
                      value={address?.line1 || ""}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-city">City</label>
                    <input
                      id="new-city"
                      placeholder="City"
                      value={address?.city || ""}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-state">State</label>
                    <input
                      id="new-state"
                      placeholder="State"
                      value={address?.state || ""}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-postal">Postal Code (PIN)</label>
                    <input
                      id="new-postal"
                      placeholder="PIN code"
                      value={address?.postalCode || ""}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      required
                    />
                  </div>

                </div>
                <button
                  type="submit"
                  className="btn"
                  style={{ alignSelf: "flex-start", marginTop: "8px" }}
                  disabled={(user?.addresses?.length || 0) >= 10}
                >
                  Save Address
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </AuthGate>
  );
}


