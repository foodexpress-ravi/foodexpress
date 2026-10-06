"use client";
import { useEffect, useState } from "react";

type Category = { id: string; name: string };
type Product = { id: string; name: string; unit: string; mrp: string; selling_price: string; stock_qty: number; is_available: boolean; category_name: string | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ categoryId: "", name: "", unit: "", mrp: "", sellingPrice: "", stockQty: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, c] = await Promise.all([fetch("/api/grocery/products").then((r) => r.json()), fetch("/api/categories?type=GROCERY").then((r) => r.json())]);
    setProducts(p.products ?? []);
    setCategories(c.categories ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/grocery/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryId: form.categoryId || null, mrp: Number(form.mrp), sellingPrice: Number(form.sellingPrice), stockQty: Number(form.stockQty) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to add product."); return; }
    setForm({ categoryId: "", name: "", unit: "", mrp: "", sellingPrice: "", stockQty: "" });
    load();
  }

  async function updateStock(id: string, stockQty: number) {
    await fetch(`/api/grocery/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stockQty }) });
    load();
  }
  async function toggleAvailable(p: Product) {
    await fetch(`/api/grocery/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: !p.is_available }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/grocery/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-bold">Products</h1>
      <form onSubmit={addProduct} className="mt-4 space-y-2 rounded-xl border bg-white p-4">
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-lg border p-2 text-sm">
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
        <input required placeholder="Unit (e.g. 1 kg)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <input required type="number" step="0.01" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="rounded-lg border p-2 text-sm" />
          <input required type="number" step="0.01" placeholder="Selling price" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="rounded-lg border p-2 text-sm" />
          <input required type="number" placeholder="Stock" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="rounded-lg border p-2 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white">Add product</button>
      </form>

      <ul className="mt-4 space-y-2">
        {products.map((p) => (
          <li key={p.id} className="rounded-xl border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.unit}{p.category_name ? ` · ${p.category_name}` : ""})</span></p>
              <span className={p.stock_qty === 0 ? "text-red-600" : ""}>{p.stock_qty} in stock</span>
            </div>
            <p className="text-gray-600">₹{p.selling_price} <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span></p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input type="number" defaultValue={p.stock_qty} onBlur={(e) => updateStock(p.id, Number(e.target.value))} className="w-20 rounded border p-1 text-xs" aria-label="Update stock" />
              <button onClick={() => toggleAvailable(p)} className="text-xs underline">{p.is_available ? "Disable" : "Enable"}</button>
              <button onClick={() => remove(p.id)} className="text-xs text-red-600 underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
