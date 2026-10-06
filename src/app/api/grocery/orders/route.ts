import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  const user = await requireRole("GROCERY_OWNER");
  const status = new URL(req.url).searchParams.get("status");
  const { rows } = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.order_status, o.payment_method, o.payment_status, o.created_at,
            u.full_name AS customer_name, u.phone AS customer_phone
     FROM orders o JOIN grocery_stores g ON g.id = o.grocery_store_id JOIN users u ON u.id = o.customer_id
     WHERE g.owner_id = $1 AND ($2::text IS NULL OR o.order_status = $2)
     ORDER BY o.created_at DESC LIMIT 100`,
    [user.id, status],
  );
  return NextResponse.json({ orders: rows });
});
