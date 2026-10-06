import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Coarse, fast gate at the edge. Real authorization (DB status, ownership) is re-checked
// in every route/action via requireRole() - never rely on middleware alone.
const RULES: { prefix: string; roles: string[] | "ANY" }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/api/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/restaurant", roles: ["RESTAURANT_OWNER"] },
  { prefix: "/dashboard/grocery", roles: ["GROCERY_OWNER"] },
  { prefix: "/dashboard/delivery", roles: ["DELIVERY_PARTNER"] },
  { prefix: "/account", roles: "ANY" },
  { prefix: "/orders", roles: "ANY" },
  { prefix: "/checkout", roles: "ANY" },
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const rule = RULES.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
  if (!rule) return NextResponse.next();

  const isApi = path.startsWith("/api/");
  let role: string | null = null;
  try {
    const token = req.cookies.get("fe_session")?.value;
    if (token) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET ?? ""), { algorithms: ["HS256"] });
      role = payload.role as string;
    }
  } catch { /* invalid or expired token -> treated as logged out */ }

  if (!role) {
    if (isApi) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (rule.roles !== "ANY" && !rule.roles.includes(role)) {
    return isApi ? NextResponse.json({ error: "You do not have access to this." }, { status: 403 }) : NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*", "/account/:path*", "/orders/:path*", "/checkout/:path*"],
};
