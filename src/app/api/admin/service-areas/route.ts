import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^[0-9]{6}$/),
  deliveryFee: z.number().min(0).optional(),
  minOrder: z.number().min(0).optional(),
  pickupAvailable: z.boolean().default(false),
});

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(`SELECT * FROM service_areas ORDER BY created_at DESC`);
  return NextResponse.json({ areas: rows });
});

export const POST = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const d = schema.parse(await readJson(req));
  try {
    const { rows } = await pool.query(
      `INSERT INTO service_areas (name, pincode, delivery_fee, min_order, pickup_available) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [d.name, d.pincode, d.deliveryFee ?? null, d.minOrder ?? null, d.pickupAvailable],
    );
    return NextResponse.json({ area: rows[0] }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "This pincode is already configured.");
    throw e;
  }
});
