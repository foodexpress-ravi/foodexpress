"use client";
import { useEffect, useState } from "react";

type Order = { id: string; order_number: string; total: string; order_status: string; payment_method: string; created_at: string; customer_name: string; customer_phone: string };
const NEXT: Record<string, string> = { PLACED: "ACCEPTED", ACCEPTED: "PREPARING", PREPARING: "READY_FOR_PICKUP" };

export default function RestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const data = await fetch("/api/restaurant/orders").then((r) => r.json());
    setOrders(data.orders ?? []);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/restaurant/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to update order."); return; }
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-bold">Orders</h1>
      <ul className="mt-4 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl border bg-white p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{o.order_number}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{o.order_status.replaceAll("_", " ")}</span>
            </div>
            <p className="text-gray-600">{o.customer_name} · {o.customer_phone}</p>
            <p className="text-gray-600">₹{o.total} · {o.payment_method}</p>
            {NEXT[o.order_status] && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(o.id, NEXT[o.order_status])} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white">
                  Mark {NEXT[o.order_status].replaceAll("_", " ")}
                </button>
                {o.order_status === "PLACED" && (
                  <button onClick={() => updateStatus(o.id, "CANCELLED")} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600">Reject</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
