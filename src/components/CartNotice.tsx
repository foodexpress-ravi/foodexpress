"use client";
import Link from "next/link";

export type Notice = { type: "ok" | "error"; text: string } | null;

export default function CartNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg md:bottom-6 ${notice.type === "ok" ? "bg-green-700" : "bg-red-600"}`}
    >
      <span>{notice.text}</span>
      <span className="flex items-center gap-3">
        {notice.type === "ok" && <Link href="/cart" className="font-semibold underline">View cart</Link>}
        <button onClick={onClose} aria-label="Dismiss" className="text-lg leading-none">×</button>
      </span>
    </div>
  );
}
