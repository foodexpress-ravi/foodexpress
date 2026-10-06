import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { customerCancelOrder } from "@/lib/orders";
import { apiHandler } from "@/lib/http";

export const POST = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx!.params;
  await customerCancelOrder(user, id);
  return NextResponse.json({ ok: true });
});
