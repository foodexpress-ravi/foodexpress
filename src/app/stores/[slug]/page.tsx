"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorState from "@/components/ErrorState";
import Skeleton from "@/components/Skeleton";
import CartNotice, { type Notice } from "@/components/CartNotice";
import { addToCartRequest } from "@/lib/clientCart";

type Product = { id: string; name: string; description: string | null; imageUrl: string | null; unit: string; mrp: string; sellingPrice: string; inStock: boolean; isAvailable: boolean };
type CatalogGroup = { id: string | null; name: string; products: Product[] };
type Store = { id: string; name: string; cover_url: string | null; address: string; rating_avg: string; rating_count: number; delivery_time_min: number; delivery_fee: string; min_order: string; is_open: boolean };

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ store: Store; catalog: CatalogGroup[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function load() {
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/grocery-stores/${slug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load this store.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load this store.");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  async function add(productId: string) {
    setAdding(productId);
    const r = await addToCartRequest({ groceryProductId: productId });
    setAdding(null);
    if (r.ok) setNotice({ type: "ok", text: "Added to cart." });
    else if (r.needsLogin) window.location.href = `/login?next=/stores/${slug}`;
    else setNotice({ type: "error", text: r.error });
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl p-4 pb-28">
        {error && <ErrorState message={error} onRetry={load} />}
        {!error && !data && <Skeleton count={3} />}
        {!error && data && (
          <>
            <div className="h-40 overflow-hidden rounded-xl bg-gray-100">
              {data.store.cover_url && <img src={data.store.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <h1 className="mt-3 text-xl font-bold">{data.store.name}</h1>
            <p className="text-sm text-gray-600">{data.store.address}</p>
            <p className="mt-1 text-sm text-gray-600">
              ⭐ {Number(data.store.rating_avg).toFixed(1)} ({data.store.rating_count}) · {data.store.delivery_time_min} min ·
              {" "}Delivery ₹{data.store.delivery_fee} · Min order ₹{data.store.min_order}
            </p>
            {!data.store.is_open && <p className="mt-1 text-sm font-medium text-red-600">Currently closed — not accepting orders</p>}

            {data.catalog.length === 0 && <p className="mt-6 text-sm text-gray-500">This store has not added any products yet.</p>}

            {data.catalog.map((group) => (
              <section key={group.id ?? "uncategorized"} className="mt-6">
                <h2 className="mb-2 font-semibold">{group.name}</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.products.map((p) => (
                    <li key={p.id} className="rounded-xl border bg-white p-3">
                      <div className="h-20 rounded-lg bg-gray-100">
                        {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />}
                      </div>
                      <p className="mt-2 text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.unit}</p>
                      <p className="mt-1 text-sm">
                        <span className="font-medium">₹{p.sellingPrice}</span>
                        {Number(p.mrp) > Number(p.sellingPrice) && <span className="ml-1 text-xs text-gray-400 line-through">₹{p.mrp}</span>}
                      </p>
                      {!p.inStock ? (
                        <p className="mt-1 text-xs font-medium text-red-600">Out of stock</p>
                      ) : (
                        <button
                          onClick={() => add(p.id)}
                          disabled={!p.isAvailable || !data.store.is_open || adding === p.id}
                          className="mt-2 w-full rounded-lg border border-orange-600 py-1 text-sm font-medium text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {adding === p.id ? "Adding…" : "Add"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </main>
      <CartNotice notice={notice} onClose={() => setNotice(null)} />
      <BottomNav />
    </>
  );
}
