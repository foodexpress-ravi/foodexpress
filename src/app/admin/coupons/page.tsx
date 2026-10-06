"use client";
import { useEffect, useState } from "react";

type Coupon = { id: string; code: string; discount_type: string; discount_value: string; min_order: string; is_active: boolean; starts_at: string; ends_at: string; used_count: number; usage_limit: number | null };

const empty = { code: "", discountType: "PERCENTAGE", discountValue: "", minOrder: "0", maxDiscount: "", startsAt: "", endsAt: "", usageLimit: "", perUserLimit: "1" };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  async function load() { setCoupons((await fetch("/api/admin/coupons").then((r) => r.json())).coupons ?? []); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      code: form.code, discountType: form.discountType, discountValue: Number(form.discountValue), minOrder: Number(form.minOrder || 0),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined, perUserLimit: Number(form.perUserLimit || 1),
    };
    const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to create coupon."); return; }
    setForm(empty);
    load();
  }
  async function toggle(c: Coupon) {
    await fetch(`/api/admin/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.is_active }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    load();
  }

  const input = "rounded-lg border p-2 text-sm";
  return (
    <div>
      <h1 className="text-lg font-bold">Coupons</h1>
      <form onSubmit={add} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border bg-white p-3 sm:grid-cols-4">
        <input required placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={input} />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={input}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed</option></select>
        <input required type="number" placeholder="Value" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={input} />
        <input type="number" placeholder="Min order" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className={input} />
        <input type="number" placeholder="Max discount" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className={input} />
        <input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={input} />
        <input required type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={input} />
        <input type="number" placeholder="Usage limit" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={input} />
        <input type="number" placeholder="Per-user limit" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className={input} />
        <button className="col-span-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white sm:col-span-1">Create</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Code</th><th className="p-2">Discount</th><th className="p-2">Used</th><th className="p-2">Valid till</th><th className="p-2">Active</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-medium">{c.code}</td>
                <td className="p-2">{c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                <td className="p-2">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
                <td className="p-2">{new Date(c.ends_at).toLocaleDateString()}</td>
                <td className="p-2">{c.is_active ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2"><button onClick={() => toggle(c)} className="text-xs text-orange-600 underline">Toggle</button><button onClick={() => remove(c.id)} className="text-xs text-red-600 underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
