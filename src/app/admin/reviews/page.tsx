"use client";
import { useEffect, useState } from "react";

type Review = { id: string; rating: number; comment: string | null; status: string; created_at: string; customer_name: string; seller_name: string };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  async function load() { setReviews((await fetch("/api/admin/reviews").then((r) => r.json())).reviews ?? []); }
  useEffect(() => { load(); }, []);

  async function toggle(r: Review) {
    await fetch(`/api/admin/reviews/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: r.status === "VISIBLE" ? "HIDDEN" : "VISIBLE" }) });
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Reviews</h1>
      <div className="mt-3 space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{"⭐".repeat(r.rating)} · {r.seller_name}</p>
              <span className={`rounded px-2 py-0.5 text-xs ${r.status === "VISIBLE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
            </div>
            <p className="text-gray-600">{r.comment || <em>No comment</em>}</p>
            <p className="text-xs text-gray-500">by {r.customer_name} · {new Date(r.created_at).toLocaleDateString()}</p>
            <button onClick={() => toggle(r)} className="mt-1 text-xs text-orange-600 underline">{r.status === "VISIBLE" ? "Hide" : "Unhide"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
