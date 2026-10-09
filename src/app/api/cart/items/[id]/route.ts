import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { removeCartItem, resolveCart, setCartItemQuantity } from "@/lib/cart";
import { readJson, apiHandlerWithParams } from "@/lib/http";
import { updateCartItemSchema } from "@/lib/validation";

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  const d = updateCartItemSchema.parse(await readJson(req));
  await setCartItemQuantity(user.id, id, d.quantity);
  return NextResponse.json(await resolveCart(user.id));
});

export const DELETE = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  await removeCartItem(user.id, id);
  return NextResponse.json(await resolveCart(user.id));
});
