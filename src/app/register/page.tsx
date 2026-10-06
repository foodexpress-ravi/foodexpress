"use client";
import { useState } from "react";
import Link from "next/link";
import { homeFor, type Role } from "@/lib/roles";

const ROLES: { value: Role; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "RESTAURANT_OWNER", label: "Restaurant owner" },
  { value: "GROCERY_OWNER", label: "Grocery store owner" },
  { value: "DELIVERY_PARTNER", label: "Delivery partner" },
];

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to sign up. Please try again."); return; }
      window.location.href = homeFor(data.user.role as Role);
    } catch {
      setError("Unable to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const input = "mt-1 w-full rounded-lg border p-3";
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-bold">Create your account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">I am a
          <select name="role" className={input} defaultValue="CUSTOMER">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">Full name<input name="fullName" required autoComplete="name" className={input} /></label>
        <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className={input} /></label>
        <label className="block text-sm">Mobile number<input name="phone" type="tel" inputMode="numeric" required maxLength={10} autoComplete="tel" className={input} /></label>
        <label className="block text-sm">Password (min 8 characters)<input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-orange-600 p-3 font-medium text-white disabled:opacity-60">
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm">Already registered? <Link href="/login" className="text-orange-600 underline">Log in</Link></p>
    </main>
  );
}
