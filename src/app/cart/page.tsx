"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";

type Line = { cartItemId: string; name: string; unitPrice: number; quantity: number; lineTotal: number; isAvailable: boolean; inStock: boolean };
type Cart = { cartId: string; lines: Line[]; subtotal: number };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) { window.location.href = "/login?next=/cart"; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load your cart.");
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your cart.");
    }
  }
  useEffect(() => { load(); }, []);

  async function updateQty(cartItemId: string, quantity: number) {
    setBusy(cartItemId);
    try {
      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: quantity <= 0 ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: quantity <= 0 ? undefined : JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to update your cart."); return; }
      setCart(data);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="text-lg font-bold">Your cart</h1>
        {error && <div className="mt-3"><ErrorState message={error} onRetry={load} /></div>}
        {!error && !cart && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
        {!error && cart && cart.lines.length === 0 && (
          <div className="mt-4">
            <EmptyState title="Your cart is empty" hint="Browse restaurants or grocery stores to add items." />
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/food" className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Order food</Link>
              <Link href="/grocery" className="rounded-lg border px-4 py-2 text-sm">Order groceries</Link>
            </div>
          </div>
        )}
        {!error && cart && cart.lines.length > 0 && (
          <>
            <ul className="mt-4 space-y-3">
              {cart.lines.map((l) => (
                <li key={l.cartItemId} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-sm text-gray-600">₹{l.unitPrice} each</p>
                    {!l.isAvailable && <p className="text-xs text-red-600">No longer available</p>}
                    {l.isAvailable && !l.inStock && <p className="text-xs text-red-600">Not enough stock</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border">
                      <button aria-label="Decrease quantity" disabled={busy === l.cartItemId} onClick={() => updateQty(l.cartItemId, l.quantity - 1)} className="px-3 py-1 disabled:opacity-40">−</button>
                      <span className="w-6 text-center text-sm">{l.quantity}</span>
                      <button aria-label="Increase quantity" disabled={busy === l.cartItemId} onClick={() => updateQty(l.cartItemId, l.quantity + 1)} className="px-3 py-1 disabled:opacity-40">+</button>
                    </div>
                    <p className="w-16 text-right text-sm font-medium">₹{l.lineTotal}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border bg-white p-4 text-sm">
              <div className="flex justify-between font-medium"><span>Item subtotal</span><span>₹{cart.subtotal}</span></div>
              <p className="mt-1 text-xs text-gray-500">Delivery fee, tax and any coupon discount are calculated at checkout.</p>
            </div>
            <Link href="/checkout" className="mt-4 block rounded-lg bg-orange-600 p-3 text-center font-medium text-white">
              Proceed to checkout
            </Link>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
