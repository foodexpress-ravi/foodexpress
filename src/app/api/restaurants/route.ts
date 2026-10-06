import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { apiHandler } from "@/lib/http";
import { parseListingParams } from "@/lib/listing";

const SORTS: Record<string, string> = {
  rating: "r.rating_avg DESC",
  delivery_time: "r.delivery_time_min ASC",
  price_low: "r.min_order ASC",
  price_high: "r.min_order DESC",
};

export const GET = apiHandler(async (req) => {
  const p = parseListingParams(new URL(req.url));
  const offset = (p.page - 1) * p.limit;

  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.slug, r.image_url, r.rating_avg, r.rating_count, r.delivery_time_min,
            r.delivery_fee, r.min_order, r.is_veg_only, r.is_open,
            EXISTS (SELECT 1 FROM service_areas sa WHERE sa.pincode = $2 AND sa.is_active) AS in_service_area
     FROM restaurants r
     WHERE r.approval_status = 'APPROVED' AND r.is_active = true
       AND ($1::text IS NULL OR r.name ILIKE '%' || $1 || '%')
       AND ($3::numeric IS NULL OR r.rating_avg >= $3)
       AND ($4::boolean IS NULL OR r.is_veg_only = $4)
     ORDER BY ${SORTS[p.sort ?? ""] ?? "r.rating_avg DESC"}
     LIMIT $5 OFFSET $6`,
    [p.search, p.pincode, p.minRating, p.veg, p.limit, offset],
  );
  return NextResponse.json({ restaurants: rows, page: p.page, limit: p.limit });
});
