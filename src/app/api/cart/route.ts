import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { addToCart, resolveCart } from "@/lib/cart";
import { apiHandler, readJson } from "@/lib/http";
import { addToCartSchema } from "@/lib/validation";

export const GET = apiHandler(async () => {
  const user = await requireRole("CUSTOMER");
  const cart = await resolveCart(user.id);
  return NextResponse.json(cart);
});

export const POST = apiHandler(async (req) => {
  const user = await requireRole("CUSTOMER");
  const d = addToCartSchema.parse(await readJson(req));
  await addToCart(user.id, d);
  return NextResponse.json(await resolveCart(user.id), { status: 201 });
});
