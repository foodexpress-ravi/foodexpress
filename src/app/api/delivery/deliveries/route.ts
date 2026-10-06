import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

// active = currently assigned to me; completed = my finished deliveries. Customer info shown only for active deliveries.
export const GET = apiHandler(async (req) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const scope = new URL(req.url).searchParams.get("scope") === "completed" ? "completed" : "active";
  const partner = (await pool.query(`SELECT id FROM delivery_partners WHERE user_id = $1`, [user.id])).rows[0];

  if (scope === "active") {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, o.total, o.payment_method, o.order_status, o.address_snapshot,
              u.full_name AS customer_name, u.phone AS customer_phone
       FROM orders o JOIN users u ON u.id = o.customer_id
       WHERE o.delivery_partner_id = $1 AND o.order_status IN ('ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY')
       ORDER BY o.created_at`,
      [partner?.id ?? null],
    );
    return NextResponse.json({ orders: rows });
  }
  const { rows } = await pool.query(
    `SELECT o.order_number, o.total, da.payout, da.created_at
     FROM delivery_assignments da JOIN orders o ON o.id = da.order_id
     WHERE da.delivery_partner_id = $1 AND da.status = 'COMPLETED' ORDER BY da.created_at DESC LIMIT 50`,
    [partner?.id ?? null],
  );
  return NextResponse.json({ deliveries: rows });
});
