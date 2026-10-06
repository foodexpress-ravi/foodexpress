import { pool } from "./db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { rows } = await pool.query(`SELECT value FROM platform_settings WHERE key = $1`, [key]);
  return rows[0] ? (rows[0].value as T) : fallback;
}

export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(`SELECT key, value FROM platform_settings WHERE key = ANY($1)`, [keys]);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}
