"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

type User = { id: string; fullName: string; email: string; phone: string; role: string };

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) { window.location.href = "/login?next=/account"; return; }
    const data = await res.json();
    setUser(data.user);
    setForm({ fullName: data.user.fullName, phone: data.user.phone });
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false);
    const res = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to save profile."); return; }
    setSaved(true);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!user) return null;
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md p-4 pb-24">
        <h1 className="text-lg font-bold">Your profile</h1>
        <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border bg-white p-4">
          <label className="block text-sm">Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
          <label className="block text-sm">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
          <p className="text-sm text-gray-500">Email: {user.email} (cannot be changed)</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-700">Saved.</p>}
          <button className="w-full rounded-lg bg-orange-600 p-2.5 text-sm font-medium text-white">Save</button>
        </form>
        <Link href="/account/addresses" className="mt-3 block rounded-xl border bg-white p-3 text-sm">Manage addresses</Link>
        <Link href="/orders" className="mt-3 block rounded-xl border bg-white p-3 text-sm">Order history</Link>
        <button onClick={logout} className="mt-3 w-full rounded-xl border border-red-300 p-3 text-sm font-medium text-red-600">Log out</button>
      </main>
      <BottomNav />
    </>
  );
}
