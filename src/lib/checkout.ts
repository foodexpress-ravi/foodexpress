import { pool } from "./db";
import { HttpError } from "./http";
import { resolveCart, clearCart } from "./cart";
import { validateCoupon } from "./coupon";
import { getSettings } from "./settings";

type CheckoutInput = { customerId: string; addressId: string; paymentMethod: "COD" | "UPI"; couponCode?: string };

/**
 * The single place order totals are computed. Every number here comes from the database at the
 * moment of checkout - never from the browser. Runs inside one transaction with row locks so
 * concurrent checkouts can't oversell grocery stock.
 */
export async function placeOrder(input: CheckoutInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Address must belong to this customer.
    const addr = (await client.query(
      `SELECT id, full_name, phone, house, street, landmark, city, state, pincode, latitude, longitude
       FROM addresses WHERE id = $1 AND user_id = $2`,
      [input.addressId, input.customerId],
    )).rows[0];
    if (!addr) throw new HttpError(404, "Please select a valid delivery address.");

    // 2. Service area check.
    const area = (await client.query(
      `SELECT delivery_fee, min_order FROM service_areas WHERE pincode = $1 AND is_active = true`,
      [addr.pincode],
    )).rows[0];
    if (!area) throw new HttpError(422, "Your address is outside our delivery area.");

    // 3. Load the cart fresh (current prices/stock) and lock the seller's stock rows if grocery.
    const cart = await resolveCart(input.customerId, client);
    if (cart.lines.length === 0) throw new HttpError(400, "Your cart is empty.");
    const unavailable = cart.lines.find((l) => !l.isAvailable || !l.inStock);
    if (unavailable) throw new HttpError(409, `"${unavailable.name}" is no longer available in the quantity you selected. Please update your cart.`);

    const settings = await getSettings(["default_delivery_fee", "default_min_order", "tax_percent", "platform_fee", "commission_restaurant", "commission_grocery", "cod_enabled", "upi_enabled"]);
    if (input.paymentMethod === "COD" && settings.cod_enabled === false) throw new HttpError(400, "Cash on Delivery is currently unavailable.");
    if (input.paymentMethod === "UPI" && settings.upi_enabled !== true) throw new HttpError(400, "UPI payment is currently unavailable.");

    let sellerRow: { id: string; min_order: string; delivery_fee: string } | undefined;
    if (cart.sellerType === "RESTAURANT") {
      sellerRow = (await client.query(
        `SELECT id, min_order, delivery_fee FROM restaurants WHERE id = $1 AND approval_status='APPROVED' AND is_active AND is_open FOR UPDATE`,
        [cart.restaurantId],
      )).rows[0];
      if (!sellerRow) throw new HttpError(409, "This restaurant is currently closed.");
    } else {
      sellerRow = (await client.query(
        `SELECT id, min_order, delivery_fee FROM grocery_stores WHERE id = $1 AND approval_status='APPROVED' AND is_active AND is_open FOR UPDATE`,
        [cart.groceryStoreId],
      )).rows[0];
      if (!sellerRow) throw new HttpError(409, "This store is currently closed.");

      // Lock stock rows and re-check quantities under the lock to prevent overselling.
      for (const line of cart.lines) {
        const p = (await client.query(`SELECT stock_qty, is_available FROM grocery_products WHERE id = $1 FOR UPDATE`, [line.groceryProductId])).rows[0];
        if (!p || !p.is_available || p.stock_qty < line.quantity) throw new HttpError(409, `"${line.name}" is out of stock. Please update your cart.`);
      }
    }

    const minOrder = Number(sellerRow.min_order);
    if (cart.subtotal < minOrder) throw new HttpError(400, `Minimum order value is ₹${minOrder}.`);

    let discount = 0, couponId: string | null = null;
    if (input.couponCode) {
      const r = await validateCoupon(input.couponCode, input.customerId, cart.subtotal, client);
      discount = r.discount;
      couponId = r.couponId;
    }

    const deliveryFee = area.delivery_fee !== null ? Number(area.delivery_fee) : Number(sellerRow.delivery_fee ?? settings.default_delivery_fee ?? 0);
    const taxPercent = Number(settings.tax_percent ?? 0);
    const tax = Math.round(((cart.subtotal - discount) * taxPercent) / 100 * 100) / 100;
    const platformFee = Number(settings.platform_fee ?? 0);
    const total = Math.round((cart.subtotal - discount + deliveryFee + tax + platformFee) * 100) / 100;

    // 4. Create the order (payment_status is always 'pending' at creation, even for UPI - see payments table).
    const order = (await client.query(
      `INSERT INTO orders (customer_id, restaurant_id, grocery_store_id, coupon_id, subtotal, discount, delivery_fee, tax,
                            platform_fee, total, payment_method, payment_status, order_status, address_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','PLACED',$12)
       RETURNING id, order_number`,
      [
        input.customerId, cart.sellerType === "RESTAURANT" ? sellerRow.id : null, cart.sellerType === "GROCERY" ? sellerRow.id : null,
        couponId, cart.subtotal, discount, deliveryFee, tax, platformFee, total, input.paymentMethod,
        JSON.stringify({ fullName: addr.full_name, phone: addr.phone, house: addr.house, street: addr.street, landmark: addr.landmark, city: addr.city, state: addr.state, pincode: addr.pincode, latitude: addr.latitude, longitude: addr.longitude }),
      ],
    )).rows[0];

    for (const line of cart.lines) {
      await client.query(
        `INSERT INTO order_items (order_id, food_item_id, grocery_product_id, item_name, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, line.foodItemId, line.groceryProductId, line.name, line.unitPrice, line.quantity, line.lineTotal],
      );
      if (line.groceryProductId) await client.query(`UPDATE grocery_products SET stock_qty = stock_qty - $2 WHERE id = $1`, [line.groceryProductId, line.quantity]);
    }

    await client.query(`INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,'PLACED',$2)`, [order.id, input.customerId]);
    await client.query(
      `INSERT INTO payments (order_id, payment_method, amount, payment_status) VALUES ($1,$2,$3,'pending')`,
      [order.id, input.paymentMethod, total],
    );

    // 5. Commission (seller_amount + commission_amount = order_amount, computed off subtotal-after-discount).
    const commissionSetting = (cart.sellerType === "RESTAURANT" ? settings.commission_restaurant : settings.commission_grocery) as { type: "PERCENTAGE" | "FIXED"; rate: number } | undefined;
    const commissionType = commissionSetting?.type ?? "PERCENTAGE";
    const commissionRate = commissionSetting?.rate ?? 0;
    const orderAmountForCommission = Math.round((cart.subtotal - discount) * 100) / 100;
    const commissionAmount = Math.min(
      Math.round((commissionType === "PERCENTAGE" ? (orderAmountForCommission * commissionRate) / 100 : commissionRate) * 100) / 100,
      orderAmountForCommission,
    );
    const sellerAmount = Math.round((orderAmountForCommission - commissionAmount) * 100) / 100;
    await client.query(
      `INSERT INTO commissions (order_id, seller_type, seller_id, order_amount, commission_type, commission_rate, commission_amount, seller_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [order.id, cart.sellerType, sellerRow.id, orderAmountForCommission, commissionType, commissionRate, commissionAmount, sellerAmount],
    );

    if (couponId) {
      await client.query(`INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES ($1,$2,$3)`, [couponId, input.customerId, order.id]);
      await client.query(`UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, [couponId]);
    }

    // 6. Notifications: customer + seller owner.
    await client.query(
      `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'ORDER_PLACED',$3,$4)`,
      [input.customerId, order.id, "Order placed", `Your order ${order.order_number} has been placed.`],
    );
    const ownerRow = (await client.query(
      cart.sellerType === "RESTAURANT" ? `SELECT owner_id FROM restaurants WHERE id = $1` : `SELECT owner_id FROM grocery_stores WHERE id = $1`,
      [sellerRow.id],
    )).rows[0];
    if (ownerRow) {
      await client.query(
        `INSERT INTO notifications (user_id, order_id, type, title, body) VALUES ($1,$2,'NEW_ORDER',$3,$4)`,
        [ownerRow.owner_id, order.id, "New order received", `Order ${order.order_number} - ₹${total}`],
      );
    }

    await clearCart(input.customerId, client);
    await client.query("COMMIT");
    return { orderId: order.id, orderNumber: order.order_number, total, paymentMethod: input.paymentMethod, paymentStatus: "pending" };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
