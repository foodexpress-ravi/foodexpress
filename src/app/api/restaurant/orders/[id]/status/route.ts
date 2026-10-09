import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sellerUpdateOrderStatus } from "@/lib/orders";
import { readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ status: z.enum(["ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"]), reason: z.string().trim().max(300).optional() });

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("RESTAURANT_OWNER");
  const { id } = await ctx.params;
  const d = schema.parse(await readJson(req));
  await sellerUpdateOrderStatus(user, id, d.status, d.reason);
  return NextResponse.json({ ok: true });
});
