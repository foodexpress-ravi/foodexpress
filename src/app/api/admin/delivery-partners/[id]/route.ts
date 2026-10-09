import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HttpError, readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ perDeliveryPayout: z.number().min(0) });

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `UPDATE delivery_partners SET per_delivery_payout = $2 WHERE id = $1 RETURNING id, per_delivery_payout`,
    [id, d.perDeliveryPayout],
  );
  if (!rows[0]) throw new HttpError(404, "Delivery partner not found.");
  return NextResponse.json({ partner: rows[0] });
});
