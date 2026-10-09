import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Wraps a route handler with no dynamic segments: known errors -> clean JSON, unknown errors -> generic message (no stack traces). */
export function apiHandler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input." }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/**
 * Wraps a route handler for a dynamic segment (e.g. [id]). The context parameter is REQUIRED here
 * (not optional) because Next.js's production build (`next build`) generates a strict type for every
 * dynamic route handler and rejects an optional/undefined-able context - it only showed up as a build
 * failure, never in `next dev`, which is why this split exists.
 */
export function apiHandlerWithParams<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
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
