"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ErrorState from "@/components/ErrorState";

type Address = { id: string; full_name: string; house: string; street: string; city: string; state: string; pincode: string; is_default: boolean };
type Cart = { lines: { name: string; quantity: number; lineTotal: number }[]; subtotal: number };

export default function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addressId, setAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI">("COD");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<number | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  async function load() {
    const [aRes, cRes] = await Promise.all([fetch("/api/addresses"), fetch("/api/cart")]);
    if (aRes.status === 401 || cRes.status === 401) { window.location.href = "/login?next=/checkout"; return; }
    const a = await aRes.json();
    const c = await cRes.json();
    setAddresses(a.addresses ?? []);
    setAddressId(a.addresses?.find((x: Address) => x.is_default)?.id ?? a.addresses?.[0]?.id ?? "");
    setCart(c);
  }
  useEffect(() => { load(); }, []);

  async function applyCoupon() {
    setCouponMsg(null);
    setDiscount(null);
    if (!couponCode.trim()) return;
    const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponCode }) });
    const data = await res.json();
    if (!res.ok) { setCouponMsg(data.error ?? "This coupon is not valid."); return; }
    setDiscount(data.discount);
    setCouponMsg(`Coupon applied: -₹${data.discount}`);
  }

  async function placeOrder() {
    setError(null);
    if (!addressId) { setError("Please select or add a delivery address."); return; }
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, paymentMethod, couponCode: couponCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to place order. Please try again.");
      window.location.href = `/orders/${data.orderId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  const subtotal = cart?.subtotal ?? 0;
  const estimatedTotal = discount !== null ? Math.max(0, subtotal - discount) : subtotal;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl p-4 pb-24">
        <h1 className="text-lg font-bold">Checkout</h1>

        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Delivery address</h2>
            <Link href="/account/addresses" className="text-sm text-orange-600 underline">Manage</Link>
          </div>
          {addresses === null && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
          {addresses?.length === 0 && (
            <p className="mt-2 text-sm text-gray-600">No saved address. <Link href="/account/addresses" className="text-orange-600 underline">Add one</Link> to continue.</p>
          )}
          <div className="mt-2 space-y-2">
            {addresses?.map((a) => (
              <label key={a.id} className={`block rounded-xl border p-3 text-sm ${addressId === a.id ? "border-orange-600" : ""}`}>
                <input type="radio" name="address" className="mr-2" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                {a.full_name} — {a.house}, {a.street}, {a.city} - {a.pincode}
              </label>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold">Coupon</h2>
          <div className="mt-2 flex gap-2">
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" className="flex-1 rounded-lg border p-2 text-sm" />
            <button onClick={applyCoupon} className="rounded-lg border px-4 text-sm font-medium">Apply</button>
          </div>
          {couponMsg && <p className={`mt-1 text-sm ${discount !== null ? "text-green-700" : "text-red-600"}`}>{couponMsg}</p>}
        </section>

        <section className="mt-6">
          <h2 className="font-semibold">Payment method</h2>
          <div className="mt-2 flex gap-3">
            <label className={`flex-1 rounded-xl border p-3 text-center text-sm ${paymentMethod === "COD" ? "border-orange-600" : ""}`}>
              <input type="radio" name="pm" className="mr-2" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} /> Cash on Delivery
            </label>
            <label className={`flex-1 rounded-xl border p-3 text-center text-sm ${paymentMethod === "UPI" ? "border-orange-600" : ""}`}>
              <input type="radio" name="pm" className="mr-2" checked={paymentMethod === "UPI"} onChange={() => setPaymentMethod("UPI")} /> UPI
            </label>
          </div>
          {paymentMethod === "UPI" && <p className="mt-1 text-xs text-gray-500">Your order stays pending until payment is confirmed.</p>}
        </section>

        <section className="mt-6 rounded-xl border bg-white p-4 text-sm">
          <div className="flex justify-between"><span>Item subtotal</span><span>₹{subtotal}</span></div>
          {discount !== null && <div className="flex justify-between text-green-700"><span>Coupon discount</span><span>-₹{discount}</span></div>}
          <p className="mt-1 text-xs text-gray-500">Delivery fee, tax and platform fee are calculated by the server and shown on your order confirmation.</p>
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Estimated total</span><span>₹{estimatedTotal}</span></div>
        </section>

        {error && <div className="mt-4"><ErrorState message={error} /></div>}
        <button onClick={placeOrder} disabled={placing || !addressId || !cart?.lines.length} className="mt-4 w-full rounded-lg bg-orange-600 p-3 font-medium text-white disabled:opacity-60">
          {placing ? "Placing order…" : "Place order"}
        </button>
      </main>
    </>
  );
}
