import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deliveryAcceptOrder } from "@/lib/orders";
import { apiHandlerWithParams } from "@/lib/http";

export const POST = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const { id } = await ctx.params;
  await deliveryAcceptOrder(user, id);
  return NextResponse.json({ ok: true });
});
