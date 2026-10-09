import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deliveryUpdateOrderStatus } from "@/lib/orders";
import { readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ status: z.enum(["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]) });

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const { id } = await ctx.params;
  const d = schema.parse(await readJson(req));
  await deliveryUpdateOrderStatus(user, id, d.status);
  return NextResponse.json({ ok: true });
});
