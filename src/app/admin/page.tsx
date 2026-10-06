"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type Stats = {
  cards: Record<string, number>;
  dailySales: { day: string; sales: number }[];
  byStatus: { status: string; count: number }[];
  foodVsGrocery: { kind: string; sales: number }[];
};
const CARD_LABELS: Record<string, string> = {
  today_orders: "Today's orders", today_sales: "Today's sales", total_customers: "Total customers",
  total_restaurants: "Total restaurants", total_grocery_stores: "Total grocery stores",
  active_delivery_partners: "Active delivery partners", pending_orders: "Pending orders",
  completed_orders: "Completed orders", cancelled_orders: "Cancelled orders", platform_commission: "Platform commission",
};
const COLORS = ["#ea580c", "#16a34a"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-lg font-bold">Dashboard</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(stats.cards).map(([key, val]) => (
          <div key={key} className="rounded-xl border bg-white p-3">
            <p className="text-xs text-gray-500">{CARD_LABELS[key] ?? key}</p>
            <p className="text-lg font-semibold">{key.includes("sales") || key.includes("commission") ? `₹${val}` : val}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Daily sales (last 7 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.dailySales}>
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Food vs Grocery sales</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.foodVsGrocery} dataKey="sales" nameKey="kind" outerRadius={80} label>
                {stats.foodVsGrocery.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-white p-4 lg:col-span-3">
          <h2 className="mb-2 text-sm font-semibold">Orders by status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byStatus}>
              <XAxis dataKey="status" fontSize={10} /><YAxis fontSize={11} /><Tooltip />
              <Bar dataKey="count" fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
