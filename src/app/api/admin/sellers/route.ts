import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  await requireRole("ADMIN");
  const type = new URL(req.url).searchParams.get("type") === "grocery" ? "grocery" : "restaurant";
  const table = type === "grocery" ? "grocery_stores" : "restaurants";
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.approval_status, s.is_active, s.is_open, s.created_at, u.full_name AS owner_name, u.email AS owner_email
     FROM ${table} s JOIN users u ON u.id = s.owner_id ORDER BY s.created_at DESC`,
  );
  return NextResponse.json({ sellers: rows });
});
