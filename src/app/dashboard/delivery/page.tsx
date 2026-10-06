"use client";
import { useEffect, useState } from "react";
import { buildWhatsAppLink, deliveryPartnerMessage } from "@/lib/whatsapp";

type Partner = { id: string; is_online: boolean; approval_status: string };
type Earnings = { today: number; total: number; completedCount: number };
type AvailableOrder = { id: string; order_number: string; total: string; payment_method: string; pickup_name: string; pickup_address: string };
type ActiveOrder = { id: string; order_number: string; total: string; payment_method: string; order_status: string; customer_name: string; customer_phone: string; address_snapshot: { house: string; street: string; city: string; pincode: string } };

const NEXT: Record<string, string> = { ASSIGNED: "PICKED_UP", PICKED_UP: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };

export default function DeliveryDashboard() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [available, setAvailable] = useState<AvailableOrder[]>([]);
  const [active, setActive] = useState<ActiveOrder[]>([]);

  async function load() {
    const res = await fetch("/api/delivery/online");
    if (res.status === 401) { window.location.href = "/login?next=/dashboard/delivery"; return; }
    const data = await res.json();
    setPartner(data.partner);
    setEarnings(await fetch("/api/delivery/earnings").then((r) => r.json()));
    setActive((await fetch("/api/delivery/deliveries?scope=active").then((r) => r.json())).orders ?? []);
    if (data.partner?.is_online) setAvailable((await fetch("/api/delivery/available").then((r) => r.json())).orders ?? []);
    else setAvailable([]);
  }
  useEffect(() => { load(); }, []);

  async function toggleOnline() {
    if (!partner) return;
    const res = await fetch("/api/delivery/online", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: !partner.is_online }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to update status."); return; }
    load();
  }

  async function accept(id: string) {
    const res = await fetch(`/api/delivery/orders/${id}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to accept this order."); return; }
    load();
  }

  async function advance(id: string, status: string) {
    const res = await fetch(`/api/delivery/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Unable to update status."); return; }
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Delivery dashboard</h1>
        {partner && (
          <button onClick={toggleOnline} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${partner.is_online ? "bg-green-600" : "bg-gray-400"}`}>
            {partner.is_online ? "Online" : "Offline"} — tap to toggle
          </button>
        )}
      </div>
      {partner && partner.approval_status !== "APPROVED" && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">Your account is pending admin approval. You cannot go online yet.</p>
      )}

      {earnings && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Today</p><p className="text-lg font-semibold">₹{earnings.today}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Total earnings</p><p className="text-lg font-semibold">₹{earnings.total}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Completed</p><p className="text-lg font-semibold">{earnings.completedCount}</p></div>
        </div>
      )}

      {active.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Active delivery</h2>
          <ul className="mt-2 space-y-3">
            {active.map((o) => (
              <li key={o.id} className="rounded-xl border bg-white p-3 text-sm">
                <p className="font-medium">{o.order_number} · {o.order_status.replaceAll("_", " ")}</p>
                <p className="text-gray-600">{o.customer_name} · {o.customer_phone}</p>
                <p className="text-gray-600">{o.address_snapshot.house}, {o.address_snapshot.street}, {o.address_snapshot.city} - {o.address_snapshot.pincode}</p>
                <p className="text-gray-600">₹{o.total} · {o.payment_method}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NEXT[o.order_status] && (
                    <button onClick={() => advance(o.id, NEXT[o.order_status])} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white">
                      Mark {NEXT[o.order_status].replaceAll("_", " ")}
                    </button>
                  )}
                  <a
                    href={buildWhatsAppLink(o.customer_phone, deliveryPartnerMessage({ orderNumber: o.order_number, customerName: o.customer_name, phone: o.customer_phone, address: `${o.address_snapshot.house}, ${o.address_snapshot.street}, ${o.address_snapshot.city}`, total: o.total, paymentMethod: o.payment_method }))}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700"
                  >
                    Message on WhatsApp
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">New assignments</h2>
        {!partner?.is_online && <p className="mt-2 text-sm text-gray-500">Go online to see available deliveries.</p>}
        <ul className="mt-2 space-y-3">
          {available.map((o) => (
            <li key={o.id} className="rounded-xl border bg-white p-3 text-sm">
              <p className="font-medium">{o.order_number}</p>
              <p className="text-gray-600">Pickup: {o.pickup_name} — {o.pickup_address}</p>
              <p className="text-gray-600">₹{o.total} · {o.payment_method}</p>
              <button onClick={() => accept(o.id)} className="mt-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white">Accept</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
