import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  const type = new URL(req.url).searchParams.get("type")?.toUpperCase();
  if (type && !["FOOD", "GROCERY"].includes(type)) throw new HttpError(400, "Invalid category type.");
  const { rows } = await pool.query(
    `SELECT id, type, name, slug, image_url, sort_order FROM categories
     WHERE is_active = true AND ($1::text IS NULL OR type = $1)
     ORDER BY sort_order, name`,
    [type ?? null],
  );
  return NextResponse.json({ categories: rows });
});
