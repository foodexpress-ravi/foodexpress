import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(
    `SELECT p.id, p.order_id, o.order_number, p.payment_method, p.amount, p.payment_status, p.transaction_reference, p.created_at
     FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ payments: rows });
});
