import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { HttpError, apiHandlerWithParams } from "@/lib/http";

// Ownership check: a customer may only view their own order. Seller/delivery/admin views arrive with their dashboards.
export const GET = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  const { id } = await ctx.params;

  const { rows } = await pool.query(
    `SELECT id, order_number, subtotal, discount, delivery_fee, tax, platform_fee, total,
            payment_method, payment_status, order_status, address_snapshot, created_at
     FROM orders WHERE id = $1 AND customer_id = $2`,
    [id, user.id],
  );
  const order = rows[0];
  if (!order) throw new HttpError(404, "Order not found.");

  const items = (await pool.query(
    `SELECT item_name, unit_price, quantity, line_total FROM order_items WHERE order_id = $1`, [id],
  )).rows;
  const history = (await pool.query(
    `SELECT status, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at`, [id],
  )).rows;

  return NextResponse.json({ order, items, history });
});
