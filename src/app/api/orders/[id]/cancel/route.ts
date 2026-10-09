import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { customerCancelOrder } from "@/lib/orders";
import { apiHandlerWithParams } from "@/lib/http";

export const POST = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  await customerCancelOrder(user, id);
  return NextResponse.json({ ok: true });
});
