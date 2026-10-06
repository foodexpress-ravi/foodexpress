import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(
    `SELECT rv.id, rv.rating, rv.comment, rv.status, rv.created_at, u.full_name AS customer_name, COALESCE(r.name, g.name) AS seller_name
     FROM reviews rv JOIN users u ON u.id = rv.customer_id
     LEFT JOIN restaurants r ON r.id = rv.restaurant_id LEFT JOIN grocery_stores g ON g.id = rv.grocery_store_id
     ORDER BY rv.created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ reviews: rows });
});
