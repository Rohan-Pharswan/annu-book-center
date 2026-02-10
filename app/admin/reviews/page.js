"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);

  async function load() {
    const res = await fetch("/api/admin/reviews");
    const data = await res.json();
    setReviews(data.reviews || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <AuthGate role="admin">
      <section>
        <h1>Review Moderation</h1>
        <div className="stack">
          {reviews.map((review) => (
            <div key={review._id} className="panel">
              <p>
                <strong>{review.userId?.name}</strong> on {review.productId?.name}
              </p>
              <p>{review.rating} / 5</p>
              <p>{review.comment}</p>
              <button className="ghost-btn" onClick={() => remove(review._id)}>
                Delete Review
              </button>
            </div>
          ))}
        </div>
      </section>
    </AuthGate>
  );
}

