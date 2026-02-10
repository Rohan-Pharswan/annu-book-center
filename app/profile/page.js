"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

const emptyAddress = { label: "Home", line1: "", city: "", state: "", postalCode: "", phone: "" };

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState(emptyAddress);

  async function loadProfile() {
    const res = await fetch("/api/profile");
    const data = await res.json();
    setUser(data.user);
    setName(data.user?.name || "");
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveName() {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await loadProfile();
  }

  async function addAddress() {
    const addresses = [...(user?.addresses || []), address];
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses })
    });
    setAddress(emptyAddress);
    await loadProfile();
  }

  return (
    <AuthGate>
      <section>
        <h1>My Profile</h1>
        <div className="panel">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" onClick={saveName}>
            Save Profile
          </button>
        </div>

        <h2>Saved Addresses</h2>
        <div className="grid two">
          {user?.addresses?.map((a) => (
            <div key={a._id} className="panel">
              <h4>{a.label}</h4>
              <p>{a.line1}</p>
              <p>
                {a.city}, {a.state} - {a.postalCode}
              </p>
              <p>{a.phone}</p>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>Add Address</h3>
          <div className="grid two">
            <input placeholder="Label" value={address.label} onChange={(e) => setAddress({ ...address, label: e.target.value })} />
            <input placeholder="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            <input placeholder="Line 1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <input placeholder="Postal Code" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
          </div>
          <button className="btn" onClick={addAddress}>
            Add Address
          </button>
        </div>
      </section>
    </AuthGate>
  );
}

