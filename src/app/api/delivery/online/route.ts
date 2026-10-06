import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

export const GET = apiHandler(async () => {
  const user = await requireRole("DELIVERY_PARTNER");
  const { rows } = await pool.query(`SELECT id, is_online, approval_status, vehicle_type, vehicle_number FROM delivery_partners WHERE user_id = $1`, [user.id]);
  if (!rows[0]) throw new HttpError(404, "Delivery partner profile not found.");
  return NextResponse.json({ partner: rows[0] });
});

export const PUT = apiHandler(async (req) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const { isOnline } = z.object({ isOnline: z.boolean() }).parse(await readJson(req));
  const { rows } = await pool.query(`UPDATE delivery_partners SET is_online = $2 WHERE user_id = $1 RETURNING id, is_online, approval_status`, [user.id, isOnline]);
  if (!rows[0]) throw new HttpError(404, "Delivery partner profile not found.");
  if (rows[0].approval_status !== "APPROVED" && isOnline) throw new HttpError(403, "Your account is not yet approved by admin.");
  return NextResponse.json({ partner: rows[0] });
});
