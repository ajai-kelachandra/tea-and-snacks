"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import {
  FiShield,
  FiUser,
  FiSearch,
  FiRefreshCw,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt?: string;
}

const ROLE_META = {
  admin: {
    label: "Admin",
    color: "bg-rose-50 text-rose-600 border border-rose-100",
    darkColor: "dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
    icon: FiShield,
  },
  user: {
    label: "Employee",
    color: "bg-blue-50 text-blue-600 border border-blue-100",
    darkColor: "dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: FiUser,
  },
};

export default function AdminRolesPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Confirm modal state
  const [confirmUser, setConfirmUser] = useState<UserRecord | null>(null);

  // Real-time subscription to users collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        })) as UserRecord[];

        // Sort: admins first, then alphabetically
        list.sort((a, b) => {
          if (a.role === b.role) return (a.name || "").localeCompare(b.name || "");
          return a.role === "admin" ? -1 : 1;
        });

        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load users:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Step 1: open the confirm modal
  const requestToggle = (user: UserRecord) => {
    setConfirmUser(user);
  };

  // Step 2: admin confirmed — do the actual Firestore update
  const confirmToggle = async () => {
    if (!confirmUser) return;
    const user = confirmUser;
    const newRole: "admin" | "user" = user.role === "admin" ? "user" : "admin";
    setConfirmUser(null);
    setUpdating(user.uid);
    try {
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      toast.success(
        `${user.name || user.email} is now ${newRole === "admin" ? "an Admin" : "an Employee"}.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading user directory…</p>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount  = users.filter((u) => u.role === "user").length;

  return (
    <div className="space-y-6 font-dm-sans animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FiShield className="text-[#1d4ed8]" />
            Role Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage access control — promote employees to Admin or demote Admins to Employee role.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Admins</p>
            <p className="text-lg font-extrabold text-rose-600">{adminCount}</p>
          </div>
          <div className="text-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Employees</p>
            <p className="text-lg font-extrabold text-blue-600">{userCount}</p>
          </div>
        </div>
      </div>

      {/* RBAC Info Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <FiShield className="text-amber-500 shrink-0 mt-0.5" size={14} />
        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
          <span className="font-bold">RBAC Active</span> — Role changes take effect on the user's next login.
          Admins can access the admin dashboard and manage all resources.
          Employees can only access the employee portal.
        </p>
      </div>

      {/* Search + Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search by name, email, or role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  User
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Email
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Current Role
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Joined
                </th>
                <th className="text-right px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 font-medium text-xs">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const meta = ROLE_META[user.role] || ROLE_META.user;
                  const RoleIcon = meta.icon;
                  const isUpdating = updating === user.uid;

                  const initials = (user.name || user.email || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join("");

                  const joinedDate = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-gray-50/60 transition-colors group"
                    >
                      {/* Avatar + Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                              user.role === "admin"
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-blue-50 text-[#1d4ed8] border border-blue-100"
                            }`}
                          >
                            {initials}
                          </div>
                          <span className="font-bold text-gray-900 truncate">
                            {user.name || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-gray-500 font-medium">
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${meta.color}`}
                        >
                          <RoleIcon size={10} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3.5 text-gray-400 font-medium">
                        {joinedDate}
                      </td>

                      {/* Toggle Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => requestToggle(user)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.role === "admin"
                              ? "border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"
                              : "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                          }`}
                        >
                          {isUpdating ? (
                            <FiRefreshCw size={10} className="animate-spin" />
                          ) : user.role === "admin" ? (
                            <>
                              <FiUser size={10} />
                              Demote to Employee
                            </>
                          ) : (
                            <>
                              <FiShield size={10} />
                              Promote to Admin
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-gray-400 text-center font-medium">
        ⚠️ Changes are saved instantly to Firestore. Users must re-login for new role to take effect.
      </p>

      {/* ── Confirm Role Change Modal ─────────────────────────── */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-scaleUp">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                            bg-amber-50 border border-amber-100">
                <FiAlertTriangle size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                  {confirmUser.role === "admin" ? "Demote to Employee" : "Promote to Admin"}
                </h3>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  This will change the user's access level.
                </p>
              </div>
              <button
                onClick={() => setConfirmUser(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* User Info card */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                confirmUser.role === "admin"
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-blue-50 text-[#1d4ed8] border border-blue-100"
              }`}>
                {(confirmUser.name || confirmUser.email || "?")
                  .split(" ").slice(0, 2).map(n => n[0]?.toUpperCase()).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{confirmUser.name || "—"}</p>
                <p className="text-[10px] text-gray-400 truncate">{confirmUser.email}</p>
              </div>
            </div>

            {/* Role change arrow */}
            <div className="flex items-center justify-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                confirmUser.role === "admin"
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}>
                {confirmUser.role === "admin" ? <FiShield size={10} /> : <FiUser size={10} />}
                {confirmUser.role === "admin" ? "Admin" : "Employee"}
              </span>
              <span className="text-gray-300 font-bold text-sm">→</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                confirmUser.role === "admin"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}>
                {confirmUser.role === "admin" ? <FiUser size={10} /> : <FiShield size={10} />}
                {confirmUser.role === "admin" ? "Employee" : "Admin"}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 text-center font-medium">
              The user must <span className="font-bold text-gray-600">re-login</span> for the new role to take effect.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setConfirmUser(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-[0.98] shadow-sm ${
                  confirmUser.role === "admin"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {confirmUser.role === "admin" ? "Confirm Demote" : "Confirm Promote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
