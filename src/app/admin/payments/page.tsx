"use client";
import { useEffect, useState } from "react";

type Payment = { id: string; order_number: string; payment_method: string; amount: string; payment_status: string; transaction_reference: string | null; created_at: string };

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refInput, setRefInput] = useState<Record<string, string>>({});

  async function load() { setPayments((await fetch("/api/admin/payments").then((r) => r.json())).payments ?? []); }
  useEffect(() => { load(); }, []);

  async function confirm(id: string, status: "paid" | "failed" | "refunded") {
    const res = await fetch(`/api/admin/payments/${id}/confirm`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, transactionReference: refInput[id] || undefined }) });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? "Unable to update payment."); return; }
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Payments</h1>
      <p className="mt-1 text-xs text-gray-500">UPI orders show as pending until you confirm them here after checking your bank/UPI app. No gateway is configured yet.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Order #</th><th className="p-2">Method</th><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Reference</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.order_number}</td><td className="p-2">{p.payment_method}</td><td className="p-2">₹{p.amount}</td>
                <td className="p-2">{p.payment_status}</td><td className="p-2">{p.transaction_reference ?? "—"}</td>
                <td className="p-2">
                  {p.payment_method === "UPI" && p.payment_status === "pending" && (
                    <div className="flex items-center gap-1">
                      <input placeholder="UTR" value={refInput[p.id] ?? ""} onChange={(e) => setRefInput({ ...refInput, [p.id]: e.target.value })} className="w-24 rounded border p-1 text-xs" />
                      <button onClick={() => confirm(p.id, "paid")} className="text-xs text-green-700 underline">Mark paid</button>
                      <button onClick={() => confirm(p.id, "failed")} className="text-xs text-red-600 underline">Mark failed</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
