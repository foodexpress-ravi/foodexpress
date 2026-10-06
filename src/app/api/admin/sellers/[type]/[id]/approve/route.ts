import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ type: string; id: string }> }) => {
  await requireRole("ADMIN");
  const { type, id } = await ctx!.params;
  const { status } = z.object({ status: z.enum(["APPROVED", "REJECTED"]) }).parse(await readJson(req));
  const table = type === "grocery" ? "grocery_stores" : type === "restaurant" ? "restaurants" : type === "delivery" ? "delivery_partners" : null;
  if (!table) throw new HttpError(400, "Invalid seller type.");
  const { rows } = await pool.query(`UPDATE ${table} SET approval_status = $2 WHERE id = $1 RETURNING id`, [id, status]);
  if (!rows[0]) throw new HttpError(404, "Not found.");
  return NextResponse.json({ ok: true });
});
