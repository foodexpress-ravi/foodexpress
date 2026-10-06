"use client";
import { useEffect, useState } from "react";

type User = { id: string; full_name: string; email: string; phone: string; role: string; status: string; created_at: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    setUsers((await fetch(`/api/admin/users?${params}`).then((r) => r.json())).users ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, role]);

  async function toggleStatus(u: User) {
    await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }) });
    load();
  }

  return (
    <div>
      <h1 className="text-lg font-bold">Users</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <input placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border p-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border p-2 text-sm">
          <option value="">All roles</option>
          {["CUSTOMER", "RESTAURANT_OWNER", "GROCERY_OWNER", "DELIVERY_PARTNER", "ADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Phone</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.full_name}</td><td className="p-2">{u.email}</td><td className="p-2">{u.phone}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${u.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.status}</span></td>
                <td className="p-2">{u.role !== "ADMIN" && <button onClick={() => toggleStatus(u)} className="text-xs text-orange-600 underline">{u.status === "ACTIVE" ? "Suspend" : "Activate"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
