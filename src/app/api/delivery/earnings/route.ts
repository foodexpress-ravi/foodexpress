import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/http";

export const GET = apiHandler(async () => {
  const user = await requireRole("DELIVERY_PARTNER");
  const partner = (await pool.query(`SELECT id FROM delivery_partners WHERE user_id = $1`, [user.id])).rows[0];
  if (!partner) return NextResponse.json({ today: 0, total: 0, completedCount: 0 });
  const stats = (await pool.query(
    `SELECT COALESCE(SUM(payout) FILTER (WHERE created_at >= date_trunc('day', now())), 0) AS today,
            COALESCE(SUM(payout), 0) AS total, COUNT(*) AS completed_count
     FROM delivery_assignments WHERE delivery_partner_id = $1 AND status = 'COMPLETED'`,
    [partner.id],
  )).rows[0];
  return NextResponse.json({ today: Number(stats.today), total: Number(stats.total), completedCount: Number(stats.completed_count) });
});
