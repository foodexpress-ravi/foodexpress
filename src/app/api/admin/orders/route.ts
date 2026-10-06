import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || null;
  const q = url.searchParams.get("q")?.trim() || null;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25)));
  const { rows } = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.order_status, o.payment_method, o.payment_status, o.created_at,
            u.full_name AS customer_name, COALESCE(r.name, g.name) AS seller_name
     FROM orders o JOIN users u ON u.id = o.customer_id
     LEFT JOIN restaurants r ON r.id = o.restaurant_id LEFT JOIN grocery_stores g ON g.id = o.grocery_store_id
     WHERE ($1::text IS NULL OR o.order_status = $1) AND ($2::text IS NULL OR o.order_number ILIKE '%'||$2||'%')
     ORDER BY o.created_at DESC LIMIT $3 OFFSET $4`,
    [status, q, limit, (page - 1) * limit],
  );
  return NextResponse.json({ orders: rows, page, limit });
});
