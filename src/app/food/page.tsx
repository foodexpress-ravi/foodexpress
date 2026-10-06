"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Skeleton from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import type { Category, Restaurant } from "@/lib/types";

type Filters = { rating: string; veg: string; sort: string };

export default function FoodPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ rating: "", veg: "", sort: "rating" });

  useEffect(() => {
    fetch("/api/categories?type=FOOD").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
  }, []);

  async function load() {
    setError(null);
    setRestaurants(null);
    const params = new URLSearchParams({ sort: filters.sort });
    if (filters.rating) params.set("rating", filters.rating);
    if (filters.veg) params.set("veg", filters.veg);
    try {
      const res = await fetch(`/api/restaurants?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load restaurants.");
      setRestaurants(data.restaurants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load restaurants.");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl p-4 pb-20">
        <h1 className="text-lg font-bold">Order food</h1>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <span key={c.id} className="shrink-0 rounded-full border bg-white px-3 py-1 text-sm">{c.name}</span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className="rounded-lg border p-2 text-sm">
            <option value="rating">Top rated</option>
            <option value="delivery_time">Fastest delivery</option>
            <option value="price_low">Min order: low to high</option>
            <option value="price_high">Min order: high to low</option>
          </select>
          <select value={filters.rating} onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value }))} className="rounded-lg border p-2 text-sm">
            <option value="">Any rating</option>
            <option value="4">4.0+</option>
            <option value="3">3.0+</option>
          </select>
          <select value={filters.veg} onChange={(e) => setFilters((f) => ({ ...f, veg: e.target.value }))} className="rounded-lg border p-2 text-sm">
            <option value="">Veg &amp; Non-Veg</option>
            <option value="true">Pure Veg</option>
            <option value="false">Non-Veg available</option>
          </select>
        </div>

        <div className="mt-4">
          {error && <ErrorState message={error} onRetry={load} />}
          {!error && restaurants === null && <Skeleton />}
          {!error && restaurants?.length === 0 && <EmptyState title="No restaurants found" hint="Try changing your filters." />}
          {!error && restaurants && restaurants.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {restaurants.map((r) => (
                <Link key={r.id} href={`/restaurants/${r.slug}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="h-32 bg-gray-100">
                    {r.image_url && <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{r.name}</h2>
                      {!r.is_open && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Closed</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">⭐ {Number(r.rating_avg).toFixed(1)} ({r.rating_count}) · {r.delivery_time_min} min</p>
                    <p className="text-sm text-gray-600">Delivery ₹{r.delivery_fee} · Min ₹{r.min_order}</p>
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
