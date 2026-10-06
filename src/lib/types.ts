export type Restaurant = {
  id: string; name: string; slug: string; image_url: string | null;
  rating_avg: string; rating_count: number; delivery_time_min: number;
  delivery_fee: string; min_order: string; is_veg_only: boolean; is_open: boolean;
};
export type GroceryStore = {
  id: string; name: string; slug: string; image_url: string | null;
  rating_avg: string; rating_count: number; delivery_time_min: number;
  delivery_fee: string; min_order: string; is_open: boolean;
};
export type Category = { id: string; type: "FOOD" | "GROCERY"; name: string; slug: string; image_url: string | null };
