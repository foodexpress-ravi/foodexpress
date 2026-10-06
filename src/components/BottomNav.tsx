"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/cart", label: "Cart", icon: "🛒" },
  { href: "/account", label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden" aria-label="Primary">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-orange-600" : "text-gray-500"}`} aria-current={active ? "page" : undefined}>
                <span aria-hidden="true" className="text-lg">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
