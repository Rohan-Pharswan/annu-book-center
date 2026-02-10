"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []));
  }, []);

  return (
    <AuthGate role="admin">
      <section>
        <h1>Registered Users</h1>
        <div className="stack">
          {users.map((user) => (
            <div key={user._id} className="panel row between">
              <span>
                {user.name} ({user.email})
              </span>
              <span>{user.role}</span>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

