import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const POST = apiHandler(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
