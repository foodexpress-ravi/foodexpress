import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupon";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

export const POST = apiHandler(async (req) => {
  const user = await requireRole("CUSTOMER");
  const { code } = z.object({ code: z.string().trim().min(1, "Please enter a coupon code.") }).parse(await readJson(req));
  const cart = await resolveCart(user.id);
  if (cart.lines.length === 0) throw new HttpError(400, "Your cart is empty.");
  const result = await validateCoupon(code, user.id, cart.subtotal);
  return NextResponse.json({ discount: result.discount });
});
