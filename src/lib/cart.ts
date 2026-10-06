import type { PoolClient } from "pg";
import { pool } from "./db";
import { HttpError } from "./http";

export type CartLine = {
  cartItemId: string;
  foodItemId: string | null;
  groceryProductId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isAvailable: boolean;
  inStock: boolean;
};

export type ResolvedCart = {
  cartId: string;
  sellerType: "RESTAURANT" | "GROCERY" | null;
  restaurantId: string | null;
  groceryStoreId: string | null;
  lines: CartLine[];
  subtotal: number;
};

export async function getOrCreateCartId(customerId: string, db: PoolClient | typeof pool = pool): Promise<string> {
  const existing = await db.query(`SELECT id FROM carts WHERE customer_id = $1`, [customerId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await db.query(`INSERT INTO carts (customer_id) VALUES ($1) RETURNING id`, [customerId]);
  return created.rows[0].id;
}

/** Reads the cart fresh from the DB - current prices, current stock, current availability. Never trusts stored totals. */
export async function resolveCart(customerId: string, db: PoolClient | typeof pool = pool): Promise<ResolvedCart> {
  const cart = await db.query(`SELECT id, restaurant_id, grocery_store_id FROM carts WHERE customer_id = $1`, [customerId]);
  if (!cart.rows[0]) return { cartId: "", sellerType: null, restaurantId: null, groceryStoreId: null, lines: [], subtotal: 0 };
  const c = cart.rows[0];

  const { rows } = await db.query(
    `SELECT ci.id AS cart_item_id, ci.quantity, ci.food_item_id, ci.grocery_product_id,
            f.name AS food_name, f.price AS food_price, f.is_available AS food_available,
            p.name AS product_name, p.selling_price AS product_price, p.is_available AS product_available, p.stock_qty
     FROM cart_items ci
     LEFT JOIN food_items f ON f.id = ci.food_item_id
     LEFT JOIN grocery_products p ON p.id = ci.grocery_product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at`,
    [c.id],
  );

  const lines: CartLine[] = rows.map((r) => {
    const isGrocery = r.grocery_product_id !== null;
    const unitPrice = Number(isGrocery ? r.product_price : r.food_price);
    return {
      cartItemId: r.cart_item_id,
      foodItemId: r.food_item_id,
      groceryProductId: r.grocery_product_id,
      name: isGrocery ? r.product_name : r.food_name,
      unitPrice,
      quantity: r.quantity,
      lineTotal: Math.round(unitPrice * r.quantity * 100) / 100,
      isAvailable: isGrocery ? r.product_available : r.food_available,
      inStock: isGrocery ? r.stock_qty >= r.quantity : true,
    };
  });

  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  return {
    cartId: c.id,
    sellerType: c.restaurant_id ? "RESTAURANT" : c.grocery_store_id ? "GROCERY" : null,
    restaurantId: c.restaurant_id,
    groceryStoreId: c.grocery_store_id,
    lines,
    subtotal,
  };
}

/** Adds/increments an item. Enforces single-seller-per-cart at the application level (mirrors the DB CHECK). */
export async function addToCart(customerId: string, input: { foodItemId?: string; groceryProductId?: string; quantity: number }) {
  if ((input.foodItemId ? 1 : 0) + (input.groceryProductId ? 1 : 0) !== 1) throw new HttpError(400, "Invalid item.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cartId = await getOrCreateCartId(customerId, client);
    const cart = await client.query(`SELECT restaurant_id, grocery_store_id FROM carts WHERE id = $1 FOR UPDATE`, [cartId]);

    if (input.foodItemId) {
      const item = (await client.query(
        `SELECT restaurant_id, is_available FROM food_items WHERE id = $1`, [input.foodItemId],
      )).rows[0];
      if (!item) throw new HttpError(404, "This item is no longer available.");
      if (!item.is_available) throw new HttpError(409, "This item is currently unavailable.");
      const { restaurant_id, grocery_store_id } = cart.rows[0];
      if (grocery_store_id) throw new HttpError(409, "Your cart has grocery items. Clear the cart to order from a restaurant.");
      if (restaurant_id && restaurant_id !== item.restaurant_id) throw new HttpError(409, "Your cart has items from another restaurant. Clear the cart to add items from this one.");
      if (!restaurant_id) await client.query(`UPDATE carts SET restaurant_id = $1 WHERE id = $2`, [item.restaurant_id, cartId]);
      await client.query(
        `INSERT INTO cart_items (cart_id, food_item_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (cart_id, food_item_id) WHERE food_item_id IS NOT NULL
         DO UPDATE SET quantity = LEAST(cart_items.quantity + $3, 50)`,
        [cartId, input.foodItemId, input.quantity],
      );
    } else {
      const item = (await client.query(
        `SELECT grocery_store_id, is_available, stock_qty FROM grocery_products WHERE id = $1`, [input.groceryProductId],
      )).rows[0];
      if (!item) throw new HttpError(404, "This product is no longer available.");
      if (!item.is_available || item.stock_qty < 1) throw new HttpError(409, "This product is out of stock.");
      const { restaurant_id, grocery_store_id } = cart.rows[0];
      if (restaurant_id) throw new HttpError(409, "Your cart has restaurant items. Clear the cart to order groceries.");
      if (grocery_store_id && grocery_store_id !== item.grocery_store_id) throw new HttpError(409, "Your cart has items from another store. Clear the cart to add items from this one.");
      if (!grocery_store_id) await client.query(`UPDATE carts SET grocery_store_id = $1 WHERE id = $2`, [item.grocery_store_id, cartId]);
      await client.query(
        `INSERT INTO cart_items (cart_id, grocery_product_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (cart_id, grocery_product_id) WHERE grocery_product_id IS NOT NULL
         DO UPDATE SET quantity = LEAST(cart_items.quantity + $3, 50)`,
        [cartId, input.groceryProductId, input.quantity],
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

export async function setCartItemQuantity(customerId: string, cartItemId: string, quantity: number) {
  const { rowCount } = await pool.query(
    `UPDATE cart_items SET quantity = $3 FROM carts
     WHERE cart_items.id = $2 AND cart_items.cart_id = carts.id AND carts.customer_id = $1`,
    [customerId, cartItemId, quantity],
  );
  if (!rowCount) throw new HttpError(404, "Item not found in your cart.");
}

export async function removeCartItem(customerId: string, cartItemId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `DELETE FROM cart_items USING carts
       WHERE cart_items.id = $2 AND cart_items.cart_id = carts.id AND carts.customer_id = $1`,
      [customerId, cartItemId],
    );
    if (!rowCount) throw new HttpError(404, "Item not found in your cart.");
    // If the cart is now empty, release the seller lock so a different restaurant/store can be ordered from next.
    await client.query(
      `UPDATE carts SET restaurant_id = NULL, grocery_store_id = NULL
       WHERE customer_id = $1 AND id NOT IN (SELECT cart_id FROM cart_items)`,
      [customerId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function clearCart(customerId: string, db: PoolClient | typeof pool = pool) {
  const cart = await db.query(`SELECT id FROM carts WHERE customer_id = $1`, [customerId]);
  if (!cart.rows[0]) return;
  await db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cart.rows[0].id]);
  await db.query(`UPDATE carts SET restaurant_id = NULL, grocery_store_id = NULL WHERE id = $1`, [cart.rows[0].id]);
}
