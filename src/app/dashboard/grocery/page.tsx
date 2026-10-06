"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Store = { id: string; name: string; is_open: boolean; approval_status: string };
type Earnings = { today: number; week: number; month: number; totalOrders: number; pending: number; lowStock: number; netEarnings: number };

export default function GroceryDashboard() {
  const [store, setStore] = useState<Store | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [form, setForm] = useState({ name: "", address: "", pincode: "", deliveryTimeMin: 45, deliveryFee: 30, minOrder: 99 });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/grocery/profile");
    if (res.status === 401) { window.location.href = "/login?next=/dashboard/grocery"; return; }
    const data = await res.json();
    setStore(data.store);
    if (data.store) setEarnings(await fetch("/api/grocery/earnings").then((r) => r.json()));
  }
  useEffect(() => { load(); }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/grocery/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to create profile."); return; }
    load();
  }

  async function toggleOpen() {
    if (!store) return;
    const res = await fetch("/api/grocery/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOpen: !store.is_open }) });
    const data = await res.json();
    if (res.ok) setStore(data.store);
  }

  if (store === null) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-lg font-bold">Set up your grocery store</h1>
        <form onSubmit={createProfile} className="mt-4 space-y-3">
          <input required placeholder="Store name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <input required placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Delivery min" value={form.deliveryTimeMin} onChange={(e) => setForm({ ...form, deliveryTimeMin: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
            <input type="number" placeholder="Delivery fee" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
            <input type="number" placeholder="Min order" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-lg bg-orange-600 p-2.5 text-sm font-medium text-white">Create profile</button>
        </form>
        <p className="mt-3 text-xs text-gray-500">Your store needs admin approval before it appears to customers.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{store.name}</h1>
        <button onClick={toggleOpen} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${store.is_open ? "bg-green-600" : "bg-gray-400"}`}>
          {store.is_open ? "Open" : "Closed"} — tap to toggle
        </button>
      </div>
      {store.approval_status !== "APPROVED" && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">Status: {store.approval_status}. Not visible to customers until admin approves it.</p>
      )}
      {earnings && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Today", `₹${earnings.today}`], ["This week", `₹${earnings.week}`], ["This month", `₹${earnings.month}`],
            ["Total orders", earnings.totalOrders], ["Pending", earnings.pending], ["Low stock", earnings.lowStock],
            ["Net earnings", `₹${earnings.netEarnings}`]].map(([label, val]) => (
            <div key={label as string} className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-semibold">{val}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/grocery/products" className="rounded-lg border px-4 py-2 text-sm font-medium">Products</Link>
        <Link href="/dashboard/grocery/orders" className="rounded-lg border px-4 py-2 text-sm font-medium">Orders</Link>
      </div>
    </main>
  );
}
