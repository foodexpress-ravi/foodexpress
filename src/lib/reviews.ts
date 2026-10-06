import { pool } from "./db";
import { HttpError } from "./http";

export async function submitReview(customerId: string, orderId: string, rating: number, comment?: string) {
  if (rating < 1 || rating > 5) throw new HttpError(400, "Rating must be between 1 and 5.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = (await client.query(
      `SELECT id, restaurant_id, grocery_store_id, order_status FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [orderId, customerId],
    )).rows[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.order_status !== "DELIVERED") throw new HttpError(409, "You can only review completed orders.");

    const { rows } = await client.query(
      `INSERT INTO reviews (order_id, customer_id, restaurant_id, grocery_store_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orderId, customerId, order.restaurant_id, order.grocery_store_id, rating, comment || null],
    );

    const sellerTable = order.restaurant_id ? "restaurants" : "grocery_stores";
    const sellerId = order.restaurant_id ?? order.grocery_store_id;
    await client.query(
      `UPDATE ${sellerTable} SET rating_count = rating_count + 1,
         rating_avg = ROUND((rating_avg * rating_count + $2) / (rating_count + 1), 1)
       WHERE id = $1`,
      [sellerId, rating],
    );
    await client.query("COMMIT");
    return rows[0].id;
  } catch (e) {
    await client.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "You have already reviewed this order.");
    throw e;
  } finally {
    client.release();
  }
}
