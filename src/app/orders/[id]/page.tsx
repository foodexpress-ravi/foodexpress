"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorState from "@/components/ErrorState";

const TIMELINE = ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

type Order = { id: string; order_number: string; subtotal: string; discount: string; delivery_fee: string; tax: string; platform_fee: string; total: string; payment_method: "COD" | "UPI"; payment_status: string; order_status: string };
type Item = { item_name: string; unit_price: string; quantity: number; line_total: string };

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ order: Order; items: Item[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.status === 401) { window.location.href = `/login?next=/orders/${id}`; return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load this order.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load this order.");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const cancelled = data?.order.order_status === "CANCELLED";
  const currentStep = data ? TIMELINE.indexOf(data.order.order_status) : -1;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl p-4 pb-24">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !data && <p className="text-sm text-gray-500">Loading…</p>}
        {!error && data && (
          <>
            <h1 className="text-lg font-bold">Order {data.order.order_number}</h1>
            <p className="text-sm text-gray-600">
              Payment: {data.order.payment_method} · Status: <span className="font-medium">{data.order.payment_status}</span>
            </p>
            {data.order.payment_method === "UPI" && data.order.payment_status === "pending" && (
              <p className="mt-1 text-xs text-amber-700">Your UPI order will be confirmed once payment is verified.</p>
            )}

            {!cancelled ? (
              <ol className="mt-6 space-y-2">
                {TIMELINE.map((step, i) => (
                  <li key={step} className={`flex items-center gap-2 text-sm ${i <= currentStep ? "text-orange-600" : "text-gray-400"}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${i <= currentStep ? "bg-orange-600" : "bg-gray-300"}`} />
                    {step.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 font-medium text-red-600">This order was cancelled.</p>
            )}

            <div className="mt-6 rounded-xl border bg-white p-4 text-sm">
              <ul className="space-y-1">
                {data.items.map((it, i) => (
                  <li key={i} className="flex justify-between"><span>{it.item_name} × {it.quantity}</span><span>₹{it.line_total}</span></li>
                ))}
              </ul>
              <div className="mt-2 space-y-1 border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{data.order.subtotal}</span></div>
                {Number(data.order.discount) > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-₹{data.order.discount}</span></div>}
                <div className="flex justify-between"><span>Delivery fee</span><span>₹{data.order.delivery_fee}</span></div>
                {Number(data.order.tax) > 0 && <div className="flex justify-between"><span>Tax</span><span>₹{data.order.tax}</span></div>}
                {Number(data.order.platform_fee) > 0 && <div className="flex justify-between"><span>Platform fee</span><span>₹{data.order.platform_fee}</span></div>}
                <div className="flex justify-between font-semibold"><span>Total</span><span>₹{data.order.total}</span></div>
              </div>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
