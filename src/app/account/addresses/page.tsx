"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ErrorState from "@/components/ErrorState";

type Address = { id: string; full_name: string; phone: string; house: string; street: string; landmark: string | null; city: string; state: string; pincode: string; is_default: boolean };

const empty = { fullName: "", phone: "", house: "", street: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/addresses");
    if (res.status === 401) { window.location.href = "/login?next=/account/addresses"; return; }
    const data = await res.json();
    setAddresses(data.addresses ?? []);
  }
  useEffect(() => { load(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to save address.");
      setForm(empty);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save address.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    await load();
  }

  const input = "mt-1 w-full rounded-lg border p-2 text-sm";
  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg p-4 pb-20">
        <h1 className="text-lg font-bold">Your addresses</h1>

        {addresses === null && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
        {addresses?.length === 0 && <p className="mt-4 text-sm text-gray-500">You have no saved addresses yet.</p>}
        <ul className="mt-4 space-y-3">
          {addresses?.map((a) => (
            <li key={a.id} className="rounded-xl border bg-white p-3 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{a.full_name} {a.is_default && <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">Default</span>}</p>
                  <p className="text-gray-600">{a.house}, {a.street}{a.landmark ? `, ${a.landmark}` : ""}</p>
                  <p className="text-gray-600">{a.city}, {a.state} - {a.pincode}</p>
                  <p className="text-gray-600">{a.phone}</p>
                </div>
                <button onClick={() => remove(a.id)} className="text-xs text-red-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 font-semibold">Add a new address</h2>
        <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl border bg-white p-4">
          <label className="block text-sm">Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={input} /></label>
          <label className="block text-sm">Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} /></label>
          <label className="block text-sm">House/Flat<input required value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} className={input} /></label>
          <label className="block text-sm">Street/Area<input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={input} /></label>
          <label className="block text-sm">Landmark (optional)<input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={input} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} /></label>
            <label className="block text-sm">State<input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={input} /></label>
          </div>
          <label className="block text-sm">Pincode<input required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={input} /></label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Set as default address
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="w-full rounded-lg bg-orange-600 p-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save address"}
          </button>
        </form>
      </main>
    </>
  );
}
