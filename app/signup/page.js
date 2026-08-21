"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || data.errors?.[0] || "Signup failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Account created! Welcome to Annu Book Store.");
      window.dispatchEvent(new CustomEvent("auth-changed"));
      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <section className="auth-wrap stack">
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1>Create Account</h1>
        <p className="muted">Join Annu Book Store for faster checkout & saved orders</p>
      </div>

      <form onSubmit={submit} className="stack">
        <div>
          <label htmlFor="signup-name">Full Name</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="signup-email">Email Address</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password (min 6 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && (
          <div className="panel" style={{ backgroundColor: "var(--danger-light)", borderColor: "var(--danger-border)", padding: "10px" }} role="alert">
            <p className="error" style={{ margin: 0, fontSize: "0.88rem" }}>{error}</p>
          </div>
        )}

        <button className="btn" disabled={submitting} style={{ marginTop: "4px" }}>
          {submitting ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0 8px" }} />

      <p className="muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
          Sign In
        </a>
      </p>
    </section>
  );
}


