import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deliveryAcceptOrder } from "@/lib/orders";
import { apiHandler } from "@/lib/http";

export const POST = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const { id } = await ctx!.params;
  await deliveryAcceptOrder(user, id);
  return NextResponse.json({ ok: true });
});
