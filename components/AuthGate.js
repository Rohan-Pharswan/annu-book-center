"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGate({ children, role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data?.user) {
          router.push("/login");
          return;
        }
        if (role && data.user.role !== role) {
          router.push("/");
          return;
        }
        setAllowed(true);
      })
      .finally(() => setLoading(false));
  }, [role, router]);

  if (loading) {
    return (
      <section className="stack" style={{ padding: "20px 0" }} aria-label="Loading content" aria-busy="true">
        <div className="skeleton" style={{ height: "36px", width: "240px", marginBottom: "16px" }} />
        <div className="skeleton skeleton-card" />
      </section>
    );
  }
  if (!allowed) return null;
  return children;
}


