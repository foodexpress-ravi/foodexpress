import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, readJson } from "@/lib/http";
import { z } from "zod";

const KEYS = ["app_name", "support_phone", "support_email", "default_delivery_fee", "default_min_order",
  "tax_percent", "platform_fee", "commission_restaurant", "commission_grocery", "cod_enabled", "upi_enabled",
  "upi_id", "upi_display_name", "upi_qr_image_url"];

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(`SELECT key, value FROM platform_settings WHERE key = ANY($1)`, [KEYS]);
  return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
});

const schema = z.record(z.string(), z.any());

// UPI payments stay off (upi_enabled=false) unless the admin has actually entered a UPI ID - see checkout.ts, which rechecks this every time.
export const PATCH = apiHandler(async (req) => {
  const admin = await requireRole("ADMIN");
  const updates = schema.parse(await readJson(req));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(updates)) {
      if (!KEYS.includes(key)) continue;
      await client.query(
        `INSERT INTO platform_settings (key, value, updated_by) VALUES ($1,$2,$3)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3`,
        [key, JSON.stringify(value), admin.id],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  const { rows } = await pool.query(`SELECT key, value FROM platform_settings WHERE key = ANY($1)`, [KEYS]);
  return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
});
