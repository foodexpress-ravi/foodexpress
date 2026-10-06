import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

// Only what's needed for pickup + delivery - never the customer's full profile or payment details.
export const GET = apiHandler(async () => {
  await requireRole("DELIVERY_PARTNER");
  const { rows } = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.payment_method, o.address_snapshot,
            COALESCE(r.name, g.name) AS pickup_name, COALESCE(r.address, g.address) AS pickup_address
     FROM orders o
     LEFT JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN grocery_stores g ON g.id = o.grocery_store_id
     WHERE o.order_status = 'READY_FOR_PICKUP' AND o.delivery_partner_id IS NULL
     ORDER BY o.created_at LIMIT 50`,
  );
  return NextResponse.json({ orders: rows });
});
