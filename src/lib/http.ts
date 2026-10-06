import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Wraps a route handler: known errors -> clean JSON, unknown errors -> generic message (no stack traces). */
export function apiHandler<C = unknown>(fn: (req: Request, ctx?: C) => Promise<Response>) {
  return async (req: Request, ctx?: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input." }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** JSON-only bodies (together with SameSite=Lax cookies this blocks classic cross-site form CSRF). */
export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Invalid request.");
  try { return await req.json(); } catch { throw new HttpError(400, "Invalid request."); }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
