"use client";
import { useEffect, useState } from "react";

type Order = { id: string; order_number: string; total: string; order_status: string; payment_method: string; payment_status: string; created_at: string; customer_name: string; seller_name: string };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    setOrders((await fetch(`/api/admin/orders?${params}`).then((r) => r.json())).orders ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, status]);

  return (
    <div>
      <h1 className="text-lg font-bold">Orders</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <input placeholder="Search order number" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border p-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border p-2 text-sm">
          <option value="">All statuses</option>
          {["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Order #</th><th className="p-2">Customer</th><th className="p-2">Seller</th><th className="p-2">Total</th><th className="p-2">Status</th><th className="p-2">Payment</th><th className="p-2">Date</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.order_number}</td><td className="p-2">{o.customer_name}</td><td className="p-2">{o.seller_name}</td>
                <td className="p-2">₹{o.total}</td><td className="p-2">{o.order_status.replaceAll("_", " ")}</td>
                <td className="p-2">{o.payment_method} · {o.payment_status}</td>
                <td className="p-2 text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
