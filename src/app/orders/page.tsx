"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

type Order = { id: string; order_number: string; total: string; order_status: string; payment_method: string; payment_status: string; created_at: string; seller_name: string; reviewed: boolean };

export default function OrdersListPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) { window.location.href = "/login?next=/orders"; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load your orders.");
      setOrders(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your orders.");
    }
  }
  useEffect(() => { load(); }, []);

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order?")) return;
    const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to cancel order."); return; }
    load();
  }

  async function submitReview(id: string) {
    const res = await fetch(`/api/orders/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to submit review."); return; }
    setReviewFor(null); setComment(""); setRating(5);
    load();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl p-4 pb-24">
        <h1 className="text-lg font-bold">Your orders</h1>
        {error && <div className="mt-3"><ErrorState message={error} onRetry={load} /></div>}
        {!error && orders === null && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
        {!error && orders?.length === 0 && <div className="mt-4"><EmptyState title="No orders yet" /></div>}
        <ul className="mt-4 space-y-3">
          {orders?.map((o) => (
            <li key={o.id} className="rounded-xl border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <Link href={`/orders/${o.id}`} className="font-medium text-orange-600 underline">{o.order_number}</Link>
                <span className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</span>
              </div>
              <p className="text-gray-600">{o.seller_name} · ₹{o.total} · {o.payment_method}</p>
              <p className="mt-1"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">{o.order_status.replaceAll("_", " ")}</span></p>
              <div className="mt-2 flex gap-2">
                {o.order_status === "PLACED" && <button onClick={() => cancelOrder(o.id)} className="text-xs text-red-600 underline">Cancel order</button>}
                {o.order_status === "DELIVERED" && !o.reviewed && (
                  <button onClick={() => setReviewFor(reviewFor === o.id ? null : o.id)} className="text-xs text-orange-600 underline">Write a review</button>
                )}
                {o.reviewed && <span className="text-xs text-gray-500">Reviewed ✓</span>}
              </div>
              {reviewFor === o.id && (
                <div className="mt-2 space-y-2 rounded-lg border p-2">
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded border p-1 text-sm">
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
                  </select>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" className="w-full rounded border p-2 text-sm" />
                  <button onClick={() => submitReview(o.id)} className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm text-white">Submit review</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </>
  );
}
