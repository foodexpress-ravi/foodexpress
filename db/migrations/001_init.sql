-- FoodExpress: initial schema (PostgreSQL 13+)
-- Money is numeric(10,2) in INR. No card/UPI credentials are ever stored.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- helpers ----------
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ---------- multi-city ready ----------
CREATE TABLE cities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  state      text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state)
);

-- ---------- users ----------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  email         text NOT NULL,
  phone         text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN
                ('CUSTOMER','RESTAURANT_OWNER','GROCERY_OWNER','DELIVERY_PARTNER','ADMIN')),
  status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE UNIQUE INDEX users_phone_uq ON users (phone);
CREATE INDEX users_role_idx ON users (role);

-- ---------- sellers ----------
CREATE TABLE restaurants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  city_id           uuid REFERENCES cities(id),
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  description       text,
  image_url         text,
  cover_url         text,
  address           text NOT NULL,
  pincode           text NOT NULL,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  rating_avg        numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count      int NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  delivery_time_min int NOT NULL DEFAULT 40 CHECK (delivery_time_min > 0),
  delivery_fee      numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  min_order         numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  is_veg_only       boolean NOT NULL DEFAULT false,
  is_open           boolean NOT NULL DEFAULT false,
  approval_status   text NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurants_owner_idx ON restaurants (owner_id);
CREATE INDEX restaurants_listing_idx ON restaurants (city_id, approval_status, is_active);

CREATE TABLE grocery_stores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  city_id           uuid REFERENCES cities(id),
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  description       text,
  image_url         text,
  cover_url         text,
  address           text NOT NULL,
  pincode           text NOT NULL,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  rating_avg        numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count      int NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  delivery_time_min int NOT NULL DEFAULT 45 CHECK (delivery_time_min > 0),
  delivery_fee      numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  min_order         numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  is_open           boolean NOT NULL DEFAULT false,
  approval_status   text NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX grocery_stores_owner_idx ON grocery_stores (owner_id);
CREATE INDEX grocery_stores_listing_idx ON grocery_stores (city_id, approval_status, is_active);

-- ---------- catalog (database-driven categories) ----------
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('FOOD','GROCERY')),
  name       text NOT NULL,
  slug       text NOT NULL,
  image_url  text,
  sort_order int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

CREATE TABLE food_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  image_url     text,
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  is_veg        boolean NOT NULL DEFAULT true,
  is_available  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX food_items_restaurant_idx ON food_items (restaurant_id, is_available);
CREATE INDEX food_items_category_idx ON food_items (category_id);
CREATE INDEX food_items_name_idx ON food_items (lower(name));

CREATE TABLE grocery_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_store_id uuid NOT NULL REFERENCES grocery_stores(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES categories(id) ON DELETE SET NULL,
  name             text NOT NULL,
  description      text,
  image_url        text,
  unit             text NOT NULL,                       -- e.g. "1 kg", "500 ml"
  mrp              numeric(10,2) NOT NULL CHECK (mrp >= 0),
  selling_price    numeric(10,2) NOT NULL CHECK (selling_price >= 0),
  stock_qty        int NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_alert  int NOT NULL DEFAULT 5 CHECK (low_stock_alert >= 0),
  is_available     boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (selling_price <= mrp)
);
CREATE INDEX grocery_products_store_idx ON grocery_products (grocery_store_id, is_available);
CREATE INDEX grocery_products_category_idx ON grocery_products (category_id);
CREATE INDEX grocery_products_name_idx ON grocery_products (lower(name));

-- ---------- customer addresses ----------
CREATE TABLE addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text NOT NULL,
  house       text NOT NULL,
  street      text NOT NULL,
  landmark    text,
  city        text NOT NULL,
  state       text NOT NULL,
  pincode     text NOT NULL CHECK (pincode ~ '^[0-9]{6}$'),
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON addresses (user_id);
CREATE UNIQUE INDEX addresses_one_default_uq ON addresses (user_id) WHERE is_default;

-- ---------- service areas & settings ----------
CREATE TABLE service_areas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id            uuid REFERENCES cities(id),
  name               text NOT NULL,
  pincode            text NOT NULL UNIQUE CHECK (pincode ~ '^[0-9]{6}$'),
  delivery_fee       numeric(10,2) CHECK (delivery_fee >= 0),   -- NULL = use platform default
  min_order          numeric(10,2) CHECK (min_order >= 0),
  delivery_start     time,
  delivery_end       time,
  pickup_available   boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- cart (prices are NEVER stored here; server recalculates) ----------
CREATE TABLE carts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id    uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  grocery_store_id uuid REFERENCES grocery_stores(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- single-seller cart: never both
  CHECK (restaurant_id IS NULL OR grocery_store_id IS NULL)
);

CREATE TABLE cart_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id            uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  food_item_id       uuid REFERENCES food_items(id) ON DELETE CASCADE,
  grocery_product_id uuid REFERENCES grocery_products(id) ON DELETE CASCADE,
  quantity           int NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK ((food_item_id IS NOT NULL)::int + (grocery_product_id IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX cart_items_food_uq ON cart_items (cart_id, food_item_id) WHERE food_item_id IS NOT NULL;
CREATE UNIQUE INDEX cart_items_grocery_uq ON cart_items (cart_id, grocery_product_id) WHERE grocery_product_id IS NOT NULL;

-- ---------- delivery ----------
CREATE TABLE delivery_partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  city_id         uuid REFERENCES cities(id),
  vehicle_type    text,
  vehicle_number  text,
  is_online       boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  per_delivery_payout numeric(10,2) NOT NULL DEFAULT 0 CHECK (per_delivery_payout >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------- coupons ----------
CREATE TABLE coupons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL,
  discount_type      text NOT NULL CHECK (discount_type IN ('PERCENTAGE','FIXED')),
  discount_value     numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order          numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  max_discount       numeric(10,2) CHECK (max_discount > 0),
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz NOT NULL,
  usage_limit        int CHECK (usage_limit > 0),
  per_user_limit     int NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  used_count         int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (discount_type <> 'PERCENTAGE' OR discount_value <= 100)
);
CREATE UNIQUE INDEX coupons_code_uq ON coupons (upper(code));

-- ---------- orders ----------
CREATE TABLE order_counters (
  year       int PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);

CREATE FUNCTION next_order_number() RETURNS text AS $$
DECLARE y int := extract(year FROM now())::int; n int;
BEGIN
  INSERT INTO order_counters (year, last_value) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_value = order_counters.last_value + 1
  RETURNING last_value INTO n;
  RETURN 'FE-' || y || '-' || lpad(n::text, 6, '0');
END; $$ LANGUAGE plpgsql;

CREATE TABLE orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text NOT NULL UNIQUE DEFAULT next_order_number(),
  customer_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  restaurant_id       uuid REFERENCES restaurants(id) ON DELETE RESTRICT,
  grocery_store_id    uuid REFERENCES grocery_stores(id) ON DELETE RESTRICT,
  delivery_partner_id uuid REFERENCES delivery_partners(id) ON DELETE SET NULL,
  coupon_id           uuid REFERENCES coupons(id) ON DELETE SET NULL,
  subtotal            numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  discount            numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  delivery_fee        numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  tax                 numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  platform_fee        numeric(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total               numeric(10,2) NOT NULL CHECK (total >= 0),
  payment_method      text NOT NULL CHECK (payment_method IN ('COD','UPI')),
  payment_status      text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  order_status        text NOT NULL DEFAULT 'PLACED' CHECK (order_status IN
                      ('PLACED','ACCEPTED','PREPARING','READY_FOR_PICKUP','ASSIGNED',
                       'PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
  address_snapshot    jsonb NOT NULL,          -- copy of address at order time
  cancel_reason       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- exactly one seller per order
  CHECK ((restaurant_id IS NOT NULL)::int + (grocery_store_id IS NOT NULL)::int = 1),
  CHECK (total = subtotal - discount + delivery_fee + tax + platform_fee)
);
CREATE INDEX orders_customer_idx ON orders (customer_id, created_at DESC);
CREATE INDEX orders_restaurant_idx ON orders (restaurant_id, order_status);
CREATE INDEX orders_store_idx ON orders (grocery_store_id, order_status);
CREATE INDEX orders_partner_idx ON orders (delivery_partner_id, order_status);
CREATE INDEX orders_status_idx ON orders (order_status, created_at DESC);

CREATE TABLE order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id       uuid REFERENCES food_items(id) ON DELETE SET NULL,
  grocery_product_id uuid REFERENCES grocery_products(id) ON DELETE SET NULL,
  item_name          text NOT NULL,              -- snapshot
  unit_price         numeric(10,2) NOT NULL CHECK (unit_price >= 0),  -- snapshot
  quantity           int NOT NULL CHECK (quantity > 0),
  line_total         numeric(10,2) NOT NULL CHECK (line_total >= 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (line_total = unit_price * quantity)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE order_status_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     text NOT NULL,
  changed_by uuid REFERENCES users(id),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_idx ON order_status_history (order_id, created_at);

CREATE TABLE payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method        text NOT NULL CHECK (payment_method IN ('COD','UPI')),
  amount                numeric(10,2) NOT NULL CHECK (amount >= 0),
  payment_status        text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  transaction_reference text,                   -- UTR / gateway id only; no card or UPI PIN data
  gateway               text,                   -- NULL until a gateway (e.g. Razorpay) is integrated
  confirmed_by          uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments (order_id);
CREATE UNIQUE INDEX payments_txn_uq ON payments (transaction_reference) WHERE transaction_reference IS NOT NULL;

CREATE TABLE delivery_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_partner_id uuid NOT NULL REFERENCES delivery_partners(id) ON DELETE RESTRICT,
  status              text NOT NULL DEFAULT 'OFFERED' CHECK (status IN ('OFFERED','ACCEPTED','REJECTED','COMPLETED','CANCELLED')),
  payout              numeric(10,2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_assignments_partner_idx ON delivery_assignments (delivery_partner_id, status);
-- at most one live assignment per order
CREATE UNIQUE INDEX delivery_assignments_active_uq ON delivery_assignments (order_id)
  WHERE status IN ('OFFERED','ACCEPTED');

CREATE TABLE coupon_usage (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coupon_usage_idx ON coupon_usage (coupon_id, user_id);

-- ---------- reviews ----------
CREATE TABLE reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,  -- one review per order
  customer_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id    uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  grocery_store_id uuid REFERENCES grocery_stores(id) ON DELETE CASCADE,
  rating           int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          text,
  status           text NOT NULL DEFAULT 'VISIBLE' CHECK (status IN ('VISIBLE','HIDDEN')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((restaurant_id IS NOT NULL)::int + (grocery_store_id IS NOT NULL)::int = 1)
);

-- ---------- commissions ----------
CREATE TABLE commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  seller_type       text NOT NULL CHECK (seller_type IN ('RESTAURANT','GROCERY')),
  seller_id         uuid NOT NULL,             -- restaurants.id or grocery_stores.id per seller_type
  order_amount      numeric(10,2) NOT NULL CHECK (order_amount >= 0),
  commission_type   text NOT NULL CHECK (commission_type IN ('PERCENTAGE','FIXED')),
  commission_rate   numeric(10,2) NOT NULL CHECK (commission_rate >= 0),
  commission_amount numeric(10,2) NOT NULL CHECK (commission_amount >= 0),
  seller_amount     numeric(10,2) NOT NULL CHECK (seller_amount >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (order_amount = commission_amount + seller_amount)
);
CREATE INDEX commissions_seller_idx ON commissions (seller_type, seller_id);

-- ---------- notifications (in-app; stored in DB) ----------
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   uuid REFERENCES orders(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- ---------- updated_at triggers on every table that has the column ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
                   t || '_set_updated_at', t);
  END LOOP;
END $$;

-- ---------- seed: configuration only (no fake users/orders/payments) ----------
INSERT INTO categories (type, name, slug, sort_order)
SELECT 'FOOD', n, regexp_replace(lower(n), '[^a-z0-9]+', '-', 'g'), ord
FROM unnest(ARRAY['Pizza','Burger','Chinese','South Indian','North Indian','Biryani',
                  'Snacks','Fast Food','Veg','Non-Veg','Beverages','Desserts'])
     WITH ORDINALITY AS t(n, ord);

INSERT INTO categories (type, name, slug, sort_order)
SELECT 'GROCERY', n, regexp_replace(lower(n), '[^a-z0-9]+', '-', 'g'), ord
FROM unnest(ARRAY['Fruits & Vegetables','Dairy & Eggs','Atta & Flour','Rice & Dal','Oil & Spices',
                  'Snacks','Biscuits','Beverages','Personal Care','Household','Cleaning','Baby Care'])
     WITH ORDINALITY AS t(n, ord);

INSERT INTO platform_settings (key, value) VALUES
  ('app_name',              '"FoodExpress"'),
  ('support_phone',         'null'),
  ('support_email',         'null'),
  ('default_delivery_fee',  '30'),
  ('default_min_order',     '99'),
  ('tax_percent',           '0'),
  ('platform_fee',          '0'),
  ('commission_restaurant', '{"type":"PERCENTAGE","rate":10}'),
  ('commission_grocery',    '{"type":"PERCENTAGE","rate":5}'),
  ('cod_enabled',           'true'),
  ('upi_enabled',           'false'),   -- stays off until admin enters a real UPI ID
  ('upi_id',                'null'),
  ('upi_display_name',      'null'),
  ('upi_qr_image_url',      'null');

COMMIT;
