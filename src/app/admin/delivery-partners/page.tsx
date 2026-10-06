"use client";
import { useEffect, useState } from "react";

type Partner = { id: string; approval_status: string; is_online: boolean; per_delivery_payout: string; full_name: string; email: string; phone: string };

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  async function load() { setPartners((await fetch("/api/admin/delivery-partners").then((r) => r.json())).partners ?? []); }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    await fetch(`/api/admin/sellers/delivery/${id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  async function savePayout(id: string, value: string) {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount < 0) return;
    await fetch(`/api/admin/delivery-partners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perDeliveryPayout: amount }) });
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Delivery Partners</h1>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Name</th><th className="p-2">Contact</th><th className="p-2">Status</th><th className="p-2">Online</th><th className="p-2">Payout/delivery</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.full_name}</td>
                <td className="p-2">{p.email}<br /><span className="text-xs text-gray-500">{p.phone}</span></td>
                <td className="p-2">{p.approval_status}</td>
                <td className="p-2">{p.is_online ? "Yes" : "No"}</td>
                <td className="p-2">
                  <span className="mr-1">₹</span>
                  <input
                    type="number" min="0" step="1" defaultValue={p.per_delivery_payout}
                    onBlur={(e) => savePayout(p.id, e.target.value)}
                    className="w-20 rounded border p-1 text-xs"
                    aria-label={`Per-delivery payout for ${p.full_name}`}
                  />
                </td>
                <td className="p-2 space-x-2">
                  {p.approval_status !== "APPROVED" && <button onClick={() => setStatus(p.id, "APPROVED")} className="text-xs text-green-700 underline">Approve</button>}
                  {p.approval_status !== "REJECTED" && <button onClick={() => setStatus(p.id, "REJECTED")} className="text-xs text-red-600 underline">Reject</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
