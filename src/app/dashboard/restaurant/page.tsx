"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Restaurant = { id: string; name: string; is_open: boolean; approval_status: string };
type Earnings = { today: number; week: number; month: number; totalOrders: number; completed: number; pending: number; cancelled: number; commission: number; netEarnings: number };

export default function RestaurantDashboard() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", pincode: "", deliveryTimeMin: 40, deliveryFee: 30, minOrder: 99, isVegOnly: false });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/restaurant/profile");
    if (res.status === 401) { window.location.href = "/login?next=/dashboard/restaurant"; return; }
    const data = await res.json();
    setRestaurant(data.restaurant);
    if (data.restaurant) {
      const e = await fetch("/api/restaurant/earnings").then((r) => r.json());
      setEarnings(e);
    }
  }
  useEffect(() => { load(); }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/restaurant/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to create profile."); return; }
    load();
  }

  async function toggleOpen() {
    if (!restaurant) return;
    const res = await fetch("/api/restaurant/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOpen: !restaurant.is_open }) });
    const data = await res.json();
    if (res.ok) setRestaurant(data.restaurant);
  }

  if (restaurant === null && !creating) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-lg font-bold">Set up your restaurant</h1>
        <form onSubmit={createProfile} className="mt-4 space-y-3">
          <input required placeholder="Restaurant name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <input required placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Delivery min" value={form.deliveryTimeMin} onChange={(e) => setForm({ ...form, deliveryTimeMin: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
            <input type="number" placeholder="Delivery fee" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
            <input type="number" placeholder="Min order" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })} className="rounded-lg border p-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isVegOnly} onChange={(e) => setForm({ ...form, isVegOnly: e.target.checked })} /> Pure vegetarian</label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-lg bg-orange-600 p-2.5 text-sm font-medium text-white">Create profile</button>
        </form>
        <p className="mt-3 text-xs text-gray-500">Your restaurant needs admin approval before it appears to customers.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{restaurant?.name}</h1>
        <button onClick={toggleOpen} className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${restaurant?.is_open ? "bg-green-600" : "bg-gray-400"}`}>
          {restaurant?.is_open ? "Open" : "Closed"} — tap to toggle
        </button>
      </div>
      {restaurant?.approval_status !== "APPROVED" && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">Status: {restaurant?.approval_status}. Your restaurant is not visible to customers until admin approves it.</p>
      )}

      {earnings && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Today", `₹${earnings.today}`], ["This week", `₹${earnings.week}`], ["This month", `₹${earnings.month}`],
            ["Total orders", earnings.totalOrders], ["Completed", earnings.completed], ["Pending", earnings.pending],
            ["Cancelled", earnings.cancelled], ["Net earnings", `₹${earnings.netEarnings}`],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-semibold">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/restaurant/menu" className="rounded-lg border px-4 py-2 text-sm font-medium">Menu</Link>
        <Link href="/dashboard/restaurant/orders" className="rounded-lg border px-4 py-2 text-sm font-medium">Orders</Link>
      </div>
    </main>
  );
}
