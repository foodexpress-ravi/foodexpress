const fs = require("fs");
const path = require("path");

const content = `import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ perDeliveryPayout: z.number().min(0) });

export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    \`UPDATE delivery_partners SET per_delivery_payout = $2 WHERE id = $1 RETURNING id, per_delivery_payout\`,
    [id, d.perDeliveryPayout],
  );
  if (!rows[0]) throw new HttpError(404, "Delivery partner not found.");
  return NextResponse.json({ partner: rows[0] });
});
`;

if (!fs.existsSync("package.json")) {
  console.error("\nGALAT FOLDER! Yahan package.json nahi hai.");
  console.error("Ye script apne foodexpress project folder ke ANDAR copy karke wahan se chalao.\n");
  process.exit(1);
}

const dir = path.join("src", "app", "api", "admin", "delivery-partners", "[id]");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "route.ts"), content);
console.log("\nSAHI BAN GAYA: " + path.join(dir, "route.ts") + "\n");
