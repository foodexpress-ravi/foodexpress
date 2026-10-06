import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ status: z.enum(["paid", "failed", "refunded"]), transactionReference: z.string().trim().max(100).optional() });

// Admin manually confirms a UPI payment after checking the bank/UPI app - this is a real state change, not a fake gateway callback.
export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const d = schema.parse(await readJson(req));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const payment = (await client.query(`SELECT order_id FROM payments WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!payment) throw new HttpError(404, "Payment not found.");
    await client.query(
      `UPDATE payments SET payment_status=$2, transaction_reference=COALESCE($3,transaction_reference), confirmed_by=$4 WHERE id=$1`,
      [id, d.status, d.transactionReference ?? null, admin.id],
    );
    await client.query(`UPDATE orders SET payment_status = $2 WHERE id = $1`, [payment.order_id, d.status]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true });
});
