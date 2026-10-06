"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorState from "@/components/ErrorState";
import Skeleton from "@/components/Skeleton";
import CartNotice, { type Notice } from "@/components/CartNotice";
import { addToCartRequest } from "@/lib/clientCart";

type FoodItem = { id: string; name: string; description: string | null; imageUrl: string | null; price: string; isVeg: boolean; isAvailable: boolean };
type MenuGroup = { id: string | null; name: string; items: FoodItem[] };
type Restaurant = { id: string; name: string; description: string | null; cover_url: string | null; address: string; rating_avg: string; rating_count: number; delivery_time_min: number; delivery_fee: string; min_order: string; is_open: boolean };

export default function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ restaurant: Restaurant; menu: MenuGroup[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function load() {
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/restaurants/${slug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load this restaurant.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load this restaurant.");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  async function add(itemId: string) {
    setAdding(itemId);
    const r = await addToCartRequest({ foodItemId: itemId });
    setAdding(null);
    if (r.ok) setNotice({ type: "ok", text: "Added to cart." });
    else if (r.needsLogin) window.location.href = `/login?next=/restaurants/${slug}`;
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
              {data.restaurant.cover_url && <img src={data.restaurant.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <h1 className="mt-3 text-xl font-bold">{data.restaurant.name}</h1>
            <p className="text-sm text-gray-600">{data.restaurant.address}</p>
            <p className="mt-1 text-sm text-gray-600">
              ⭐ {Number(data.restaurant.rating_avg).toFixed(1)} ({data.restaurant.rating_count}) · {data.restaurant.delivery_time_min} min ·
              {" "}Delivery ₹{data.restaurant.delivery_fee} · Min order ₹{data.restaurant.min_order}
            </p>
            {!data.restaurant.is_open && <p className="mt-1 text-sm font-medium text-red-600">Currently closed — not accepting orders</p>}

            {data.menu.length === 0 && <p className="mt-6 text-sm text-gray-500">This restaurant has not added any menu items yet.</p>}

            {data.menu.map((group) => (
              <section key={group.id ?? "uncategorized"} className="mt-6">
                <h2 className="mb-2 font-semibold">{group.name}</h2>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3">
                      <div>
                        <p className="flex items-center gap-1 font-medium">
                          <span aria-hidden="true">{item.isVeg ? "🟢" : "🔴"}</span> {item.name}
                        </p>
                        {item.description && <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>}
                        <p className="mt-1 text-sm font-medium">₹{item.price}</p>
                        {!item.isAvailable && <p className="text-xs text-red-600">Currently unavailable</p>}
                      </div>
                      <button
                        onClick={() => add(item.id)}
                        disabled={!item.isAvailable || !data.restaurant.is_open || adding === item.id}
                        className="shrink-0 rounded-lg border border-orange-600 px-3 py-1.5 text-sm font-medium text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {adding === item.id ? "Adding…" : "Add"}
                      </button>
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
