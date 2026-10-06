import type { PoolClient } from "pg";
import { pool } from "./db";
import { HttpError } from "./http";

export type CouponResult = { couponId: string; discount: number };

/** Re-validated at checkout time too - never trust a discount amount computed earlier on the client or in an earlier request. */
export async function validateCoupon(code: string, userId: string, subtotal: number, db: PoolClient | typeof pool = pool): Promise<CouponResult> {
  const { rows } = await db.query(
    `SELECT id, discount_type, discount_value, min_order, max_discount, starts_at, ends_at,
            usage_limit, per_user_limit, used_count, is_active
     FROM coupons WHERE upper(code) = upper($1)`,
    [code],
  );
  const c = rows[0];
  if (!c || !c.is_active) throw new HttpError(400, "This coupon is not valid.");
  const now = new Date();
  if (now < new Date(c.starts_at) || now > new Date(c.ends_at)) throw new HttpError(400, "This coupon has expired.");
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) throw new HttpError(400, "This coupon has reached its usage limit.");
  if (subtotal < Number(c.min_order)) throw new HttpError(400, `Add items worth ₹${c.min_order} or more to use this coupon.`);

  const userUsage = await db.query(`SELECT count(*)::int AS n FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2`, [c.id, userId]);
  if (userUsage.rows[0].n >= c.per_user_limit) throw new HttpError(400, "You have already used this coupon the maximum number of times.");

  let discount = c.discount_type === "PERCENTAGE" ? (subtotal * Number(c.discount_value)) / 100 : Number(c.discount_value);
  if (c.max_discount !== null) discount = Math.min(discount, Number(c.max_discount));
  discount = Math.min(discount, subtotal);
  return { couponId: c.id, discount: Math.round(discount * 100) / 100 };
}
