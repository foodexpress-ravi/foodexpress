"use client";
import { useEffect, useState } from "react";

type Seller = { id: string; name: string; approval_status: string; is_active: boolean; is_open: boolean; owner_name: string; owner_email: string };

export default function SellersPage() {
  const [type, setType] = useState<"restaurant" | "grocery">("restaurant");
  const [sellers, setSellers] = useState<Seller[]>([]);

  async function load() { setSellers((await fetch(`/api/admin/sellers?type=${type}`).then((r) => r.json())).sellers ?? []); }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type]);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    await fetch(`/api/admin/sellers/${type}/${id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Sellers</h1>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setType("restaurant")} className={`rounded-lg px-3 py-1.5 text-sm ${type === "restaurant" ? "bg-orange-600 text-white" : "border"}`}>Restaurants</button>
        <button onClick={() => setType("grocery")} className={`rounded-lg px-3 py-1.5 text-sm ${type === "grocery" ? "bg-orange-600 text-white" : "border"}`}>Grocery stores</button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Name</th><th className="p-2">Owner</th><th className="p-2">Status</th><th className="p-2">Open</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.owner_name}<br /><span className="text-xs text-gray-500">{s.owner_email}</span></td>
                <td className="p-2">{s.approval_status}</td>
                <td className="p-2">{s.is_open ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2">
                  {s.approval_status !== "APPROVED" && <button onClick={() => setStatus(s.id, "APPROVED")} className="text-xs text-green-700 underline">Approve</button>}
                  {s.approval_status !== "REJECTED" && <button onClick={() => setStatus(s.id, "REJECTED")} className="text-xs text-red-600 underline">Reject</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
