import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().trim().min(3).max(300),
  pincode: z.string().trim().regex(/^[0-9]{6}$/),
  deliveryTimeMin: z.number().int().min(5).max(180),
  deliveryFee: z.number().min(0),
  minOrder: z.number().min(0),
});
function slugify(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7); }

export const GET = apiHandler(async () => {
  const user = await requireRole("GROCERY_OWNER");
  const { rows } = await pool.query(`SELECT * FROM grocery_stores WHERE owner_id = $1`, [user.id]);
  return NextResponse.json({ store: rows[0] ?? null });
});

export const POST = apiHandler(async (req) => {
  const user = await requireRole("GROCERY_OWNER");
  const d = schema.parse(await readJson(req));
  const existing = (await pool.query(`SELECT id FROM grocery_stores WHERE owner_id = $1`, [user.id])).rows[0];
  if (existing) throw new HttpError(409, "You already have a store profile. Please edit it instead.");
  const { rows } = await pool.query(
    `INSERT INTO grocery_stores (owner_id, name, slug, description, image_url, cover_url, address, pincode, delivery_time_min, delivery_fee, min_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [user.id, d.name, slugify(d.name), d.description || null, d.imageUrl || null, d.coverUrl || null, d.address, d.pincode, d.deliveryTimeMin, d.deliveryFee, d.minOrder],
  );
  return NextResponse.json({ store: rows[0] }, { status: 201 });
});

export const PATCH = apiHandler(async (req) => {
  const user = await requireRole("GROCERY_OWNER");
  const d = schema.partial().parse(await readJson(req));
  const current = (await pool.query(`SELECT id FROM grocery_stores WHERE owner_id = $1`, [user.id])).rows[0];
  if (!current) throw new HttpError(404, "Please create your store profile first.");
  const { rows } = await pool.query(
    `UPDATE grocery_stores SET name=COALESCE($2,name), description=COALESCE($3,description), image_url=COALESCE($4,image_url),
       cover_url=COALESCE($5,cover_url), address=COALESCE($6,address), pincode=COALESCE($7,pincode),
       delivery_time_min=COALESCE($8,delivery_time_min), delivery_fee=COALESCE($9,delivery_fee), min_order=COALESCE($10,min_order)
     WHERE id = $1 RETURNING *`,
    [current.id, d.name, d.description, d.imageUrl, d.coverUrl, d.address, d.pincode, d.deliveryTimeMin, d.deliveryFee, d.minOrder],
  );
  return NextResponse.json({ store: rows[0] });
});

export const PUT = apiHandler(async (req) => {
  const user = await requireRole("GROCERY_OWNER");
  const { isOpen } = z.object({ isOpen: z.boolean() }).parse(await readJson(req));
  const { rows } = await pool.query(`UPDATE grocery_stores SET is_open = $2 WHERE owner_id = $1 RETURNING *`, [user.id, isOpen]);
  if (!rows[0]) throw new HttpError(404, "Please create your store profile first.");
  return NextResponse.json({ store: rows[0] });
});
