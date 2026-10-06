// Shared helpers for public restaurant/store listing filters + sorting.
import type { QueryResultRow } from "pg";
import { pool } from "./db";

export type SortKey = "rating" | "delivery_time" | "price_low" | "price_high";

export function parseListingParams(url: URL) {
  return {
    search: url.searchParams.get("q")?.trim() || null,
    pincode: url.searchParams.get("pincode")?.trim() || null,
    minRating: url.searchParams.get("rating") ? Number(url.searchParams.get("rating")) : null,
    veg: url.searchParams.get("veg") === "true" ? true : url.searchParams.get("veg") === "false" ? false : null,
    sort: (url.searchParams.get("sort") as SortKey | null) ?? null,
    page: Math.max(1, Number(url.searchParams.get("page") ?? 1)),
    limit: Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20))),
  };
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params);
}
