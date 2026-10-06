import { pool } from "./db";
import { HttpError } from "./http";
import type { SessionUser } from "./auth";

const SELLER_FORWARD: Record<string, string> = { PLACED: "ACCEPTED", ACCEPTED: "PREPARING", PREPARING: "READY_FOR_PICKUP" };
const DELIVERY_FORWARD: Record<string, string> = { ASSIGNED: "PICKED_UP", PICKED_UP: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };

async function restoreStockIfCancelled(orderId: string, client: import("pg").PoolClient) {
  const items = (await client.query(
    `SELECT grocery_product_id, quantity FROM order_items WHERE order_id = $1 AND grocery_product_id IS NOT NULL`, [orderId],
  )).rows;
  for (const it of items) await client.query(`UPDATE grocery_products SET stock_qty = stock_qty + $2 WHERE id = $1`, [it.grocery_product_id, it.quantity]);
}

/** Restaurant/grocery owner moves their own order forward one step, or rejects it (PLACED -> CANCELLED). Ownership + transition are both checked server-side. */
export async function sellerUpdateOrderStatus(user: SessionUser, orderId: string, nextStatus: string, reason?: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ownerCol = user.role === "RESTAURANT_OWNER" ? "r.owner_id" : "g.owner_id";
    const order = (await client.query(
      `SELECT o.id, o.order_status, o.customer_id FROM orders o
       LEFT JOIN restaurants r ON r.id = o.restaurant_id
       LEFT JOIN grocery_stores g ON g.id = o.grocery_store_id
       WHERE o.id = $1 AND ${ownerCol} = $2 FOR UPDATE OF o`,
      [orderId, user.id],
    )).rows[0];
    if (!order) throw new HttpError(404, "Order not found.");

    const isReject = nextStatus === "CANCELLED";
    if (isReject) {
      if (order.order_status !== "PLACED") throw new HttpError(409, "This order can no longer be rejected.");
      await restoreStockIfCancelled(orderId, client);
    } else if (SELLER_FORWARD[order.order_status] !== nextStatus) {
      throw new HttpError(409, `Order cannot move from ${order.order_status} to ${nextStatus}.`);
    }

    await client.query(`UPDATE orders SET order_status = $2, cancel_reason = $3 WHERE id = $1`, [orderId, nextStatus, isReject ? (reason ?? "Rejected by seller") : null]);
    await client.query(`INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES ($1,$2,$3,$4)`, [orderId, nextStatus, user.id, isReject ? reason ?? null : null]);
    await client.query(
      `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'ORDER_STATUS',$3,$4)`,
      [order.customer_id, orderId, "Order update", isReject ? "Your order was rejected by the seller." : `Your order is now ${nextStatus.replaceAll("_", " ")}.`],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Customer can cancel only while the order is still PLACED (i.e. before the seller has accepted it). */
export async function customerCancelOrder(user: SessionUser, orderId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = (await client.query(`SELECT id, order_status FROM orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`, [orderId, user.id])).rows[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.order_status !== "PLACED") throw new HttpError(409, "This order can no longer be cancelled. Please contact support.");
    await restoreStockIfCancelled(orderId, client);
    await client.query(`UPDATE orders SET order_status = 'CANCELLED', cancel_reason = 'Cancelled by customer' WHERE id = $1`, [orderId]);
    await client.query(`INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES ($1,'CANCELLED',$2,'Cancelled by customer')`, [orderId, user.id]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** A delivery partner self-assigns an order that is ready and has no active assignment yet (first to accept wins - enforced by a DB unique index). */
export async function deliveryAcceptOrder(user: SessionUser, orderId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const partner = (await client.query(`SELECT id, approval_status, is_online FROM delivery_partners WHERE user_id = $1`, [user.id])).rows[0];
    if (!partner || partner.approval_status !== "APPROVED") throw new HttpError(403, "Your delivery partner account is not yet approved.");
    if (!partner.is_online) throw new HttpError(409, "Go online to accept deliveries.");

    const order = (await client.query(
      `SELECT id, customer_id, total FROM orders WHERE id = $1 AND order_status = 'READY_FOR_PICKUP' AND delivery_partner_id IS NULL FOR UPDATE`,
      [orderId],
    )).rows[0];
    if (!order) throw new HttpError(409, "This order is no longer available.");

    const payout = (await client.query(`SELECT per_delivery_payout FROM delivery_partners WHERE id = $1`, [partner.id])).rows[0].per_delivery_payout;
    // The active-assignment-per-order unique index makes this insert fail safely under a race; caught below as 409.
    await client.query(`INSERT INTO delivery_assignments (order_id, delivery_partner_id, status, payout) VALUES ($1,$2,'ACCEPTED',$3)`, [orderId, partner.id, payout]);
    await client.query(`UPDATE orders SET delivery_partner_id = $2, order_status = 'ASSIGNED' WHERE id = $1`, [orderId, partner.id]);
    await client.query(`INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,'ASSIGNED',$2)`, [orderId, user.id]);
    await client.query(
      `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'ORDER_STATUS','Delivery partner assigned','A delivery partner has been assigned to your order.')`,
      [order.customer_id, orderId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "This order was just accepted by another delivery partner.");
    throw e;
  } finally {
    client.release();
  }
}

/** Delivery partner advances their own assigned order: ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED. */
export async function deliveryUpdateOrderStatus(user: SessionUser, orderId: string, nextStatus: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const partner = (await client.query(`SELECT id FROM delivery_partners WHERE user_id = $1`, [user.id])).rows[0];
    if (!partner) throw new HttpError(403, "Not a delivery partner account.");
    const order = (await client.query(
      `SELECT id, order_status, customer_id, payment_method FROM orders WHERE id = $1 AND delivery_partner_id = $2 FOR UPDATE`,
      [orderId, partner.id],
    )).rows[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (DELIVERY_FORWARD[order.order_status] !== nextStatus) throw new HttpError(409, `Order cannot move from ${order.order_status} to ${nextStatus}.`);

    await client.query(`UPDATE orders SET order_status = $2 WHERE id = $1`, [orderId, nextStatus]);
    await client.query(`INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,$2,$3)`, [orderId, nextStatus, user.id]);

    if (nextStatus === "DELIVERED") {
      await client.query(`UPDATE delivery_assignments SET status = 'COMPLETED' WHERE order_id = $1 AND delivery_partner_id = $2`, [orderId, partner.id]);
      // Cash physically collected at the doorstep - this is a real state change, not a simulated payment gateway confirmation.
      if (order.payment_method === "COD") await client.query(`UPDATE payments SET payment_status = 'paid', confirmed_by = $2 WHERE order_id = $1`, [orderId, user.id]);
      await client.query(
        `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'ORDER_STATUS','Order delivered','Your order has been delivered. Enjoy!')`,
        [order.customer_id, orderId],
      );
    } else {
      await client.query(
        `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'ORDER_STATUS','Order update',$3)`,
        [order.customer_id, orderId, `Your order is now ${nextStatus.replaceAll("_", " ")}.`],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
