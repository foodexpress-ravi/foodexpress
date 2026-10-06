import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { placeOrder } from "@/lib/checkout";
import { apiHandler, clientIp, HttpError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { checkoutSchema } from "@/lib/validation";

export const POST = apiHandler(async (req) => {
  const user = await requireRole("CUSTOMER");
  if (!rateLimit(`checkout:${clientIp(req)}:${user.id}`, 10, 60_000)) throw new HttpError(429, "Too many attempts. Please try again in a minute.");
  const d = checkoutSchema.parse(await readJson(req));
  const result = await placeOrder({ customerId: user.id, addressId: d.addressId, paymentMethod: d.paymentMethod, couponCode: d.couponCode || undefined });
  return NextResponse.json(result, { status: 201 });
});
