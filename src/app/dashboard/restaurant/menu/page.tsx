"use client";
import { useEffect, useState } from "react";

type Category = { id: string; name: string };
type Item = { id: string; name: string; description: string | null; price: string; is_veg: boolean; is_available: boolean; category_name: string | null };

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ categoryId: "", name: "", description: "", price: "", isVeg: true });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [i, c] = await Promise.all([fetch("/api/restaurant/menu").then((r) => r.json()), fetch("/api/categories?type=FOOD").then((r) => r.json())]);
    setItems(i.items ?? []);
    setCategories(c.categories ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/restaurant/menu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryId: form.categoryId || null, price: Number(form.price) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to add item."); return; }
    setForm({ categoryId: "", name: "", description: "", price: "", isVeg: true });
    load();
  }

  async function toggleAvailable(item: Item) {
    await fetch(`/api/restaurant/menu/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: !item.is_available }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/restaurant/menu/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-bold">Menu</h1>
      <form onSubmit={addItem} className="mt-4 space-y-2 rounded-xl border bg-white p-4">
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-lg border p-2 text-sm">
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input required placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
        <div className="flex items-center gap-3">
          <input required type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-32 rounded-lg border p-2 text-sm" />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} /> Veg</label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">Add item</button>
      </form>

      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
            <div>
              <p className="font-medium">{it.is_veg ? "🟢" : "🔴"} {it.name} {it.category_name && <span className="text-xs text-gray-500">({it.category_name})</span>}</p>
              <p className="text-gray-600">₹{it.price}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAvailable(it)} className="text-xs underline">{it.is_available ? "Mark unavailable" : "Mark available"}</button>
              <button onClick={() => remove(it.id)} className="text-xs text-red-600 underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
