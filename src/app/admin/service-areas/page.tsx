"use client";
import { useEffect, useState } from "react";

type Area = { id: string; name: string; pincode: string; delivery_fee: string | null; min_order: string | null; is_active: boolean; pickup_available: boolean };

export default function ServiceAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [form, setForm] = useState({ name: "", pincode: "", deliveryFee: "", minOrder: "", pickupAvailable: false });
  const [error, setError] = useState<string | null>(null);

  async function load() { setAreas((await fetch("/api/admin/service-areas").then((r) => r.json())).areas ?? []); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/service-areas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, deliveryFee: form.deliveryFee ? Number(form.deliveryFee) : undefined, minOrder: form.minOrder ? Number(form.minOrder) : undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to add service area."); return; }
    setForm({ name: "", pincode: "", deliveryFee: "", minOrder: "", pickupAvailable: false });
    load();
  }
  async function toggle(a: Area) {
    await fetch(`/api/admin/service-areas/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.is_active }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Remove this service area? Customers there will no longer be able to check out.")) return;
    await fetch(`/api/admin/service-areas/${id}`, { method: "DELETE" });
    load();
  }

  const input = "rounded-lg border p-2 text-sm";
  return (
    <div>
      <h1 className="text-lg font-bold">Service Areas</h1>
      <p className="mt-1 text-xs text-gray-500">Only pincodes listed here can check out. Leave fee/min order blank to use the platform default.</p>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3">
        <input required placeholder="Area name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <input required placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={input} />
        <input placeholder="Delivery fee (optional)" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} className={input} />
        <input placeholder="Min order (optional)" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className={input} />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.pickupAvailable} onChange={(e) => setForm({ ...form, pickupAvailable: e.target.checked })} /> Pickup available</label>
        <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Area</th><th className="p-2">Pincode</th><th className="p-2">Delivery fee</th><th className="p-2">Min order</th><th className="p-2">Active</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.name}</td><td className="p-2">{a.pincode}</td>
                <td className="p-2">{a.delivery_fee ?? "Default"}</td><td className="p-2">{a.min_order ?? "Default"}</td>
                <td className="p-2">{a.is_active ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2"><button onClick={() => toggle(a)} className="text-xs text-orange-600 underline">Toggle</button><button onClick={() => remove(a.id)} className="text-xs text-red-600 underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
