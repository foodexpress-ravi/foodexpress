import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { submitReview } from "@/lib/reviews";
import { readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });

export const POST = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("CUSTOMER");
  const { id } = await ctx.params;
  const d = schema.parse(await readJson(req));
  const reviewId = await submitReview(user.id, id, d.rating, d.comment);
  return NextResponse.json({ id: reviewId }, { status: 201 });
});
