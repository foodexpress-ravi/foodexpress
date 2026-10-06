"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Skeleton from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

type Results = {
  restaurants: { id: string; name: string; slug: string }[];
  stores: { id: string; name: string; slug: string }[];
  foodItems: { id: string; name: string; price: string; restaurant_slug: string; restaurant_name: string }[];
  groceryProducts: { id: string; name: string; selling_price: string; store_slug: string; store_name: string }[];
};

function SearchInner() {
  const params = useSearchParams();
  const term = (params.get("q") ?? "").trim();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (term.length < 2) { setResults(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/search?q=${encodeURIComponent(term)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to search right now.");
        if (!cancelled) setResults(json);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Unable to search right now."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [term]);

  const total = results ? results.restaurants.length + results.stores.length + results.foodItems.length + results.groceryProducts.length : 0;
  const row = "block rounded-xl border bg-white p-3 text-sm";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl p-4 pb-24">
        <h1 className="text-lg font-bold">{term ? `Results for "${term}"` : "Search"}</h1>
        {term.length < 2 && <p className="mt-3 text-sm text-gray-500">Type at least 2 letters in the search bar above.</p>}
        {loading && <div className="mt-4"><Skeleton count={3} /></div>}
        {error && <div className="mt-4"><ErrorState message={error} /></div>}
        {!loading && !error && results && total === 0 && <div className="mt-4"><EmptyState title="Nothing found" hint="Try a different word." /></div>}

        {!loading && !error && results && total > 0 && (
          <div className="mt-4 space-y-6">
            {results.restaurants.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold">Restaurants</h2>
                <ul className="space-y-2">
                  {results.restaurants.map((r) => <li key={r.id}><Link href={`/restaurants/${r.slug}`} className={row}>{r.name}</Link></li>)}
                </ul>
              </section>
            )}
            {results.foodItems.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold">Food items</h2>
                <ul className="space-y-2">
                  {results.foodItems.map((f) => (
                    <li key={f.id}><Link href={`/restaurants/${f.restaurant_slug}`} className={row}>{f.name} · ₹{f.price} <span className="text-gray-500">at {f.restaurant_name}</span></Link></li>
                  ))}
                </ul>
              </section>
            )}
            {results.stores.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold">Grocery stores</h2>
                <ul className="space-y-2">
                  {results.stores.map((s) => <li key={s.id}><Link href={`/stores/${s.slug}`} className={row}>{s.name}</Link></li>)}
                </ul>
              </section>
            )}
            {results.groceryProducts.length > 0 && (
              <section>
                <h2 className="mb-2 font-semibold">Grocery products</h2>
                <ul className="space-y-2">
                  {results.groceryProducts.map((p) => (
                    <li key={p.id}><Link href={`/stores/${p.store_slug}`} className={row}>{p.name} · ₹{p.selling_price} <span className="text-gray-500">at {p.store_name}</span></Link></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
