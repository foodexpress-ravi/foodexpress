import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  const user = await requireRole("CUSTOMER");
  const { rows } = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.order_status, o.payment_method, o.payment_status, o.created_at,
            COALESCE(r.name, g.name) AS seller_name,
            EXISTS (SELECT 1 FROM reviews rv WHERE rv.order_id = o.id) AS reviewed
     FROM orders o
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN grocery_stores g ON g.id = o.grocery_store_id
     WHERE o.customer_id = $1
     ORDER BY o.created_at DESC`,
    [user.id],
  );
  return NextResponse.json({ orders: rows });
});
