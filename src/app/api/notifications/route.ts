import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/http";

export const GET = apiHandler(async () => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  const { rows } = await pool.query(
    `SELECT id, order_id, type, title, body, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [user.id],
  );
  return NextResponse.json({ notifications: rows });
});
