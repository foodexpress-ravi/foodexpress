import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(3).max(40),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  minOrder: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
}).refine((d) => new Date(d.endsAt) > new Date(d.startsAt), { message: "End date must be after start date.", path: ["endsAt"] });

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
  return NextResponse.json({ coupons: rows });
});

export const POST = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const d = schema.parse(await readJson(req));
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, starts_at, ends_at, usage_limit, per_user_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.code.toUpperCase(), d.discountType, d.discountValue, d.minOrder, d.maxDiscount ?? null, d.startsAt, d.endsAt, d.usageLimit ?? null, d.perUserLimit],
    );
    return NextResponse.json({ coupon: rows[0] }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "A coupon with this code already exists.");
    throw e;
  }
});
