import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  const user = await requireRole("GROCERY_OWNER");
  const store = (await pool.query(`SELECT id FROM grocery_stores WHERE owner_id = $1`, [user.id])).rows[0];
  if (!store) return NextResponse.json({ today: 0, week: 0, month: 0, totalOrders: 0, pending: 0, lowStock: 0, commission: 0, netEarnings: 0 });

  const stats = (await pool.query(
    `SELECT
       COALESCE(SUM(c.seller_amount) FILTER (WHERE o.created_at >= date_trunc('day', now())), 0) AS today,
       COALESCE(SUM(c.seller_amount) FILTER (WHERE o.created_at >= date_trunc('week', now())), 0) AS week,
       COALESCE(SUM(c.seller_amount) FILTER (WHERE o.created_at >= date_trunc('month', now())), 0) AS month,
       COUNT(*) AS total_orders,
       COUNT(*) FILTER (WHERE o.order_status NOT IN ('DELIVERED','CANCELLED')) AS pending,
       COALESCE(SUM(c.commission_amount), 0) AS commission,
       COALESCE(SUM(c.seller_amount), 0) AS net_earnings
     FROM orders o JOIN commissions c ON c.order_id = o.id WHERE o.grocery_store_id = $1`,
    [store.id],
  )).rows[0];
  const lowStock = (await pool.query(`SELECT count(*)::int AS n FROM grocery_products WHERE grocery_store_id = $1 AND stock_qty <= low_stock_alert`, [store.id])).rows[0].n;

  return NextResponse.json({
    today: Number(stats.today), week: Number(stats.week), month: Number(stats.month), totalOrders: Number(stats.total_orders),
    pending: Number(stats.pending), lowStock, commission: Number(stats.commission), netEarnings: Number(stats.net_earnings),
  });
});
