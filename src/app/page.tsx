import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getSessionUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl p-4 pb-24">
        {user ? (
          <p className="text-sm text-gray-600">
            Hi, {user.fullName}.
            {user.role !== "CUSTOMER" && (
              <> <Link href={homeFor(user.role)} className="text-orange-600 underline">Go to your dashboard</Link></>
            )}
          </p>
        ) : (
          <div className="flex gap-3">
            <Link href="/login" className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white">Log in</Link>
            <Link href="/register" className="rounded-lg border border-orange-600 px-5 py-2.5 text-sm font-medium text-orange-600">Sign up</Link>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/food" className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-3xl" aria-hidden="true">🍕</p>
            <h2 className="mt-2 text-lg font-semibold">Order food</h2>
            <p className="text-sm text-gray-600">Restaurants that deliver to you</p>
          </Link>
          <Link href="/grocery" className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-3xl" aria-hidden="true">🛒</p>
            <h2 className="mt-2 text-lg font-semibold">Order groceries</h2>
            <p className="text-sm text-gray-600">Daily essentials from local stores</p>
          </Link>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
