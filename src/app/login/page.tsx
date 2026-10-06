"use client";
import { useState } from "react";
import Link from "next/link";
import { homeFor, type Role } from "@/lib/roles";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to log in. Please try again."); return; }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(data.user.role as Role);
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-bold">Log in to FoodExpress</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border p-3" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-orange-600 p-3 font-medium text-white disabled:opacity-60">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">New here? <Link href="/register" className="text-orange-600 underline">Create an account</Link></p>
    </main>
  );
}
