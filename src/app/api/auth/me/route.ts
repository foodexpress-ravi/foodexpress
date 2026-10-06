import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/http";

export const GET = apiHandler(async () => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  return NextResponse.json({ user }); // never includes password_hash
});
