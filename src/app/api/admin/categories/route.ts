import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ type: z.enum(["FOOD", "GROCERY"]), name: z.string().trim().min(1).max(80), imageUrl: z.string().url().optional().or(z.literal("")), sortOrder: z.number().int().default(0) });

export const GET = apiHandler(async () => {
  await requireRole("ADMIN");
  const { rows } = await pool.query(`SELECT * FROM categories ORDER BY type, sort_order, name`);
  return NextResponse.json({ categories: rows });
});

export const POST = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const d = schema.parse(await readJson(req));
  const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { rows } = await pool.query(
    `INSERT INTO categories (type, name, slug, image_url, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.type, d.name, slug, d.imageUrl || null, d.sortOrder],
  );
  return NextResponse.json({ category: rows[0] }, { status: 201 });
});
