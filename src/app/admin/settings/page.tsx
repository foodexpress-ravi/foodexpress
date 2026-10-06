"use client";
import { useEffect, useState } from "react";

type Commission = { type: "PERCENTAGE" | "FIXED"; rate: number };
type Settings = {
  app_name: string; support_phone: string | null; support_email: string | null;
  default_delivery_fee: number; default_min_order: number; tax_percent: number; platform_fee: number;
  commission_restaurant: Commission; commission_grocery: Commission;
  cod_enabled: boolean; upi_enabled: boolean; upi_id: string | null; upi_display_name: string | null; upi_qr_image_url: string | null;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetch("/api/admin/settings").then((r) => r.json()).then((d) => setS(d.settings)); }, []);

  async function save() {
    if (!s) return;
    setError(null); setSaved(false);
    // UPI can only be turned on once a real UPI ID is entered - enforced again server-side.
    if (s.upi_enabled && !s.upi_id) { setError("Enter a UPI ID before enabling UPI payments."); return; }
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Unable to save settings."); return; }
    setS(data.settings);
    setSaved(true);
  }

  if (!s) return <p className="text-sm text-gray-500">Loading…</p>;
  const input = "mt-1 w-full rounded-lg border p-2 text-sm";
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => setS({ ...s, [key]: val });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-bold">Platform Settings</h1>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Platform</h2>
        <label className="mt-2 block text-sm">App name<input value={s.app_name ?? ""} onChange={(e) => set("app_name", e.target.value)} className={input} /></label>
        <label className="mt-2 block text-sm">Support phone<input value={s.support_phone ?? ""} onChange={(e) => set("support_phone", e.target.value)} className={input} /></label>
        <label className="mt-2 block text-sm">Support email<input value={s.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} className={input} /></label>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Delivery &amp; fees</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="mt-2 block text-sm">Default delivery fee<input type="number" value={s.default_delivery_fee} onChange={(e) => set("default_delivery_fee", Number(e.target.value))} className={input} /></label>
          <label className="mt-2 block text-sm">Default min order<input type="number" value={s.default_min_order} onChange={(e) => set("default_min_order", Number(e.target.value))} className={input} /></label>
          <label className="mt-2 block text-sm">Tax %<input type="number" value={s.tax_percent} onChange={(e) => set("tax_percent", Number(e.target.value))} className={input} /></label>
          <label className="mt-2 block text-sm">Platform fee (₹)<input type="number" value={s.platform_fee} onChange={(e) => set("platform_fee", Number(e.target.value))} className={input} /></label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Commission</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mt-2 text-sm font-medium">Restaurants</p>
            <select value={s.commission_restaurant.type} onChange={(e) => set("commission_restaurant", { ...s.commission_restaurant, type: e.target.value as "PERCENTAGE" | "FIXED" })} className={input}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed</option></select>
            <input type="number" value={s.commission_restaurant.rate} onChange={(e) => set("commission_restaurant", { ...s.commission_restaurant, rate: Number(e.target.value) })} className={input} />
          </div>
          <div>
            <p className="mt-2 text-sm font-medium">Grocery stores</p>
            <select value={s.commission_grocery.type} onChange={(e) => set("commission_grocery", { ...s.commission_grocery, type: e.target.value as "PERCENTAGE" | "FIXED" })} className={input}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed</option></select>
            <input type="number" value={s.commission_grocery.rate} onChange={(e) => set("commission_grocery", { ...s.commission_grocery, rate: Number(e.target.value) })} className={input} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Payments</h2>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={s.cod_enabled} onChange={(e) => set("cod_enabled", e.target.checked)} /> Cash on Delivery enabled</label>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={s.upi_enabled} onChange={(e) => set("upi_enabled", e.target.checked)} /> UPI enabled</label>
        <label className="mt-2 block text-sm">UPI ID<input value={s.upi_id ?? ""} onChange={(e) => set("upi_id", e.target.value)} placeholder="yourbusiness@upi" className={input} /></label>
        <label className="mt-2 block text-sm">UPI display name<input value={s.upi_display_name ?? ""} onChange={(e) => set("upi_display_name", e.target.value)} className={input} /></label>
        <label className="mt-2 block text-sm">UPI QR image URL<input value={s.upi_qr_image_url ?? ""} onChange={(e) => set("upi_qr_image_url", e.target.value)} className={input} /></label>
        <p className="mt-2 text-xs text-amber-700">No payment gateway is connected. UPI orders are recorded as pending and must be confirmed manually on the Payments page - see Admin → Payments.</p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Settings saved.</p>}
      <button onClick={save} className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white">Save settings</button>
    </div>
  );
}
