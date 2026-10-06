import Link from "next/link";

const LINKS = [
  ["/admin", "Dashboard"], ["/admin/users", "Users"], ["/admin/sellers", "Sellers"],
  ["/admin/delivery-partners", "Delivery Partners"], ["/admin/orders", "Orders"], ["/admin/payments", "Payments"],
  ["/admin/categories", "Categories"], ["/admin/coupons", "Coupons"], ["/admin/service-areas", "Service Areas"],
  ["/admin/reviews", "Reviews"], ["/admin/settings", "Settings"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <nav className="border-b bg-white p-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <p className="mb-2 px-2 font-bold text-orange-600">FoodExpress Admin</p>
        <ul className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          {LINKS.map(([href, label]) => (
            <li key={href} className="shrink-0">
              <Link href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-100">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 p-4 md:p-6">{children}</div>
    </div>
  );
}
