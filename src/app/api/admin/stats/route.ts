import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const cards = (await pool.query(
    `SELECT
       (SELECT count(*) FROM orders WHERE created_at >= date_trunc('day', now())) AS today_orders,
       (SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= date_trunc('day', now())) AS today_sales,
       (SELECT count(*) FROM users WHERE role = 'CUSTOMER') AS total_customers,
       (SELECT count(*) FROM restaurants) AS total_restaurants,
       (SELECT count(*) FROM grocery_stores) AS total_grocery_stores,
       (SELECT count(*) FROM delivery_partners WHERE is_online) AS active_delivery_partners,
       (SELECT count(*) FROM orders WHERE order_status NOT IN ('DELIVERED','CANCELLED')) AS pending_orders,
       (SELECT count(*) FROM orders WHERE order_status = 'DELIVERED') AS completed_orders,
       (SELECT count(*) FROM orders WHERE order_status = 'CANCELLED') AS cancelled_orders,
       (SELECT COALESCE(SUM(commission_amount),0) FROM commissions) AS platform_commission`,
  )).rows[0];

  const dailySales = (await pool.query(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(SUM(o.total), 0) AS sales
     FROM generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') d(day)
     LEFT JOIN orders o ON date_trunc('day', o.created_at) = d.day
     GROUP BY d.day ORDER BY d.day`,
  )).rows;

  const byStatus = (await pool.query(`SELECT order_status, count(*) AS n FROM orders GROUP BY order_status`)).rows;
  const foodVsGrocery = (await pool.query(
    `SELECT CASE WHEN restaurant_id IS NOT NULL THEN 'Food' ELSE 'Grocery' END AS kind, COALESCE(SUM(total),0) AS sales
     FROM orders GROUP BY 1`,
  )).rows;

  return NextResponse.json({
    cards: Object.fromEntries(Object.entries(cards).map(([k, v]) => [k, Number(v)])),
    dailySales: dailySales.map((r) => ({ day: r.day, sales: Number(r.sales) })),
    byStatus: byStatus.map((r) => ({ status: r.order_status, count: Number(r.n) })),
    foodVsGrocery: foodVsGrocery.map((r) => ({ kind: r.kind, sales: Number(r.sales) })),
  });
});
