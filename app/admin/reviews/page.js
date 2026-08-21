"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/ToastProvider";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const toast = useToast();

  async function load() {
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      toast.error("Failed to load reviews");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete review");
        return;
      }
      toast.info("Review deleted");
      await load();
    } catch {
      toast.error("Failed to delete review");
    }
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

