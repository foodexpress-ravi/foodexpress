import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { apiHandler } from "@/lib/http";
import { parseListingParams } from "@/lib/listing";

export const GET = apiHandler(async (req) => {
  const p = parseListingParams(new URL(req.url));
  const offset = (p.page - 1) * p.limit;
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.slug, s.image_url, s.rating_avg, s.rating_count, s.delivery_time_min,
            s.delivery_fee, s.min_order, s.is_open
     FROM grocery_stores s
     WHERE s.approval_status = 'APPROVED' AND s.is_active = true
       AND ($1::text IS NULL OR s.name ILIKE '%' || $1 || '%')
       AND ($2::numeric IS NULL OR s.rating_avg >= $2)
     ORDER BY s.rating_avg DESC
     LIMIT $3 OFFSET $4`,
    [p.search, p.minRating, p.limit, offset],
  );
  return NextResponse.json({ stores: rows, page: p.page, limit: p.limit });
});
