import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, readJson } from "@/lib/http";
import { addressSchema } from "@/lib/validation";

export const GET = apiHandler(async () => {
  const user = await requireRole("CUSTOMER");
  const { rows } = await pool.query(`SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`, [user.id]);
  return NextResponse.json({ addresses: rows });
});

export const POST = apiHandler(async (req) => {
  const user = await requireRole("CUSTOMER");
  const d = addressSchema.parse(await readJson(req));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (d.isDefault) await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [user.id]);
    const { rows } = await client.query(
      `INSERT INTO addresses (user_id, full_name, phone, house, street, landmark, city, state, pincode, latitude, longitude, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [user.id, d.fullName, d.phone, d.house, d.street, d.landmark || null, d.city, d.state, d.pincode, d.latitude ?? null, d.longitude ?? null, d.isDefault ?? false],
    );
    await client.query("COMMIT");
    return NextResponse.json({ address: rows[0] }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});
