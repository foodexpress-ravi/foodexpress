import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HttpError, readJson, apiHandlerWithParams } from "@/lib/http";
import { addressSchema } from "@/lib/validation";

// Ownership check on every statement: user_id = $owner is always in the WHERE clause.
export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  const d = addressSchema.parse(await readJson(req));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (d.isDefault) await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [user.id]);
    const { rows } = await client.query(
      `UPDATE addresses SET full_name=$3, phone=$4, house=$5, street=$6, landmark=$7, city=$8, state=$9, pincode=$10, latitude=$11, longitude=$12, is_default=$13
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user.id, d.fullName, d.phone, d.house, d.street, d.landmark || null, d.city, d.state, d.pincode, d.latitude ?? null, d.longitude ?? null, d.isDefault ?? false],
    );
    if (!rows[0]) throw new HttpError(404, "Address not found.");
    await client.query("COMMIT");
    return NextResponse.json({ address: rows[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

export const DELETE = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  const { rowCount } = await pool.query(`DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [id, user.id]);
  if (!rowCount) throw new HttpError(404, "Address not found.");
  return NextResponse.json({ ok: true });
});
