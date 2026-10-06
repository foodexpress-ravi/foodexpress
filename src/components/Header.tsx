"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 p-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-orange-600">FoodExpress</Link>
        <button type="button" className="hidden shrink-0 truncate text-sm text-gray-600 sm:block" aria-label="Delivery location">
          📍 Select location
        </button>
        <form onSubmit={onSearch} role="search" className="flex-1">
          <input
            value={q} onChange={(e) => setQ(e.target.value)} type="search"
            placeholder="Search for food or groceries" aria-label="Search for food or groceries"
            className="w-full rounded-full border bg-gray-50 px-4 py-2 text-sm"
          />
        </form>
        <Link href="/account" className="hidden shrink-0 text-sm sm:block">Profile</Link>
        <Link href="/cart" aria-label="Cart" className="shrink-0 text-xl">🛒</Link>
      </div>
    </header>
  );
}
