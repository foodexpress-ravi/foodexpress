"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Skeleton from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import type { Category, GroceryStore } from "@/lib/types";

export default function GroceryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<GroceryStore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories?type=GROCERY").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
  }, []);

  async function load() {
    setError(null);
    setStores(null);
    try {
      const res = await fetch("/api/grocery-stores");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load stores.");
      setStores(data.stores);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load stores.");
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl p-4 pb-20">
        <h1 className="text-lg font-bold">Order groceries</h1>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <span key={c.id} className="shrink-0 rounded-full border bg-white px-3 py-1 text-sm">{c.name}</span>
          ))}
        </div>

        <div className="mt-4">
          {error && <ErrorState message={error} onRetry={load} />}
          {!error && stores === null && <Skeleton />}
          {!error && stores?.length === 0 && <EmptyState title="No grocery stores found nearby" />}
          {!error && stores && stores.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {stores.map((s) => (
                <Link key={s.id} href={`/stores/${s.slug}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="h-32 bg-gray-100">
                    {s.image_url && <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{s.name}</h2>
                      {!s.is_open && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Closed</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">⭐ {Number(s.rating_avg).toFixed(1)} ({s.rating_count}) · {s.delivery_time_min} min</p>
                    <p className="text-sm text-gray-600">Delivery ₹{s.delivery_fee} · Min ₹{s.min_order}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
