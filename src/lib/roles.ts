export type Role = "CUSTOMER" | "RESTAURANT_OWNER" | "GROCERY_OWNER" | "DELIVERY_PARTNER" | "ADMIN";

export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN": return "/admin";
    case "RESTAURANT_OWNER": return "/dashboard/restaurant";
    case "GROCERY_OWNER": return "/dashboard/grocery";
    case "DELIVERY_PARTNER": return "/dashboard/delivery";
    default: return "/";
  }
}
