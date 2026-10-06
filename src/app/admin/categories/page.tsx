"use client";
import { useEffect, useState } from "react";

type Category = { id: string; type: string; name: string; is_active: boolean; sort_order: number };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ type: "FOOD", name: "", sortOrder: 0 });
  const [error, setError] = useState<string | null>(null);

  async function load() { setCategories((await fetch("/api/admin/categories").then((r) => r.json())).categories ?? []); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to add category."); return; }
    setForm({ type: "FOOD", name: "", sortOrder: 0 });
    load();
  }
  async function toggle(c: Category) {
    await fetch(`/api/admin/categories/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.is_active }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Categories</h1>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border p-2 text-sm"><option>FOOD</option><option>GROCERY</option></select>
        <input required placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border p-2 text-sm" />
        <input type="number" placeholder="Sort order" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-24 rounded-lg border p-2 text-sm" />
        <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Type</th><th className="p-2">Name</th><th className="p-2">Active</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.type}</td><td className="p-2">{c.name}</td><td className="p-2">{c.is_active ? "Yes" : "No"}</td>
                <td className="p-2 space-x-2"><button onClick={() => toggle(c)} className="text-xs text-orange-600 underline">Toggle</button><button onClick={() => remove(c.id)} className="text-xs text-red-600 underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
