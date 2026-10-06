import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const role = url.searchParams.get("role") || null;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25)));
  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, status, created_at FROM users
     WHERE ($1::text IS NULL OR full_name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%' OR phone ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR role = $2)
     ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [q, role, limit, (page - 1) * limit],
  );
  return NextResponse.json({ users: rows, page, limit });
});
