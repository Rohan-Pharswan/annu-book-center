"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Login failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Welcome back, " + (data.user?.name || "User") + "!");
      window.dispatchEvent(new CustomEvent("auth-changed"));
      router.push(redirect.startsWith("/") ? redirect : `/${redirect}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const signupLink = redirect && redirect !== "/" ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup";

  return (
    <section className="auth-wrap stack">
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1>Sign In</h1>
        <p className="muted">Access your cart, orders, and saved addresses</p>
      </div>

      <form onSubmit={submit} className="stack">
        <div>
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
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
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0 8px" }} />

      <p className="muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>
        Don't have an account yet?{" "}
        <a href={signupLink} style={{ color: "var(--primary)", fontWeight: 600 }}>
          Create an account
        </a>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-wrap stack"><p className="muted" style={{ textAlign: "center" }}>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}



