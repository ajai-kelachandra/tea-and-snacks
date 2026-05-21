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
  FiBriefcase,
  FiGrid,
  FiUsers,
} from "react-icons/fi";
import { useAppSelector } from "@/lib/hooks";

interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: "super_admin" | "payroll_admin" | "manager" | "hr" | "employee" | "admin" | "user";
  createdAt?: string;
}

const ROLE_META = {
  super_admin: {
    label: "Super Admin",
    color: "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
    icon: FiShield,
    desc: "Full administrative access, user role management, and global workspace operations.",
  },
  payroll_admin: {
    label: "Payroll Admin",
    color: "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
    icon: FiBriefcase,
    desc: "Access to timesheets, leave management, attendance tracking, and snack order history.",
  },
  manager: {
    label: "Manager",
    color: "bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
    icon: FiGrid,
    desc: "Task management capabilities, project workspace controls, and task delegation.",
  },
  hr: {
    label: "HR Manager",
    color: "bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
    icon: FiUsers,
    desc: "Employee directory lookup, department records, and overall attendance monitoring.",
  },
  employee: {
    label: "Employee",
    color: "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30",
    icon: FiUser,
    desc: "Access to employee pantry perks portal, personal leave directory, and basic task dashboard.",
  },
};

export default function AdminRolesPage() {
  const { userRole, uid: currentUserUid } = useAppSelector((s) => s.auth);
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Confirm modal state
  const [confirmUser, setConfirmUser] = useState<UserRecord | null>(null);
  const [targetRole, setTargetRole] = useState<"super_admin" | "payroll_admin" | "manager" | "hr" | "employee" | null>(null);

  // Real-time subscription to users collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          // Normalize legacy roles
          let mappedRole = data.role;
          if (mappedRole === "admin") mappedRole = "super_admin";
          if (mappedRole === "user") mappedRole = "employee";

          return {
            uid: d.id,
            ...data,
            role: mappedRole,
          };
        }) as UserRecord[];

        // Sort: Super Admins first, then other roles, then alphabetically
        list.sort((a, b) => {
          const roleWeight = (r: string) => {
            if (r === "super_admin") return 0;
            if (r === "payroll_admin") return 1;
            if (r === "manager") return 2;
            if (r === "hr") return 3;
            return 4; // employee
          };

          const wA = roleWeight(a.role);
          const wB = roleWeight(b.role);

          if (wA !== wB) return wA - wB;
          return (a.name || "").localeCompare(b.name || "");
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

  // Step 1: Open the confirm modal when a new role is selected
  const handleRoleSelect = (user: UserRecord, role: "super_admin" | "payroll_admin" | "manager" | "hr" | "employee") => {
    if (user.uid === currentUserUid) {
      toast.error("Security Restriction: You cannot modify your own administrative privileges.");
      return;
    }
    setConfirmUser(user);
    setTargetRole(role);
  };

  // Step 2: Firestore update committed on confirmation
  const confirmRoleChange = async () => {
    if (!confirmUser || !targetRole) return;
    const user = confirmUser;
    const newRole = targetRole;

    setConfirmUser(null);
    setTargetRole(null);
    setUpdating(user.uid);

    try {
      await updateDoc(doc(db, "users", user.uid), { role: newRole });
      toast.success(
        `Successfully changed ${user.name || user.email}'s role to ${ROLE_META[newRole]?.label || newRole}.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user access level.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const roleLabel = (ROLE_META[u.role as keyof typeof ROLE_META]?.label || u.role).toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      roleLabel.includes(q)
    );
  });

  // Guard access: strictly for super_admin
  if (userRole !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 shadow-sm animate-pulse">
          <FiShield size={32} />
        </div>
        <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Access Restricted</h2>
        <p className="text-xs text-gray-400 leading-relaxed font-medium">
          The Role Management workspace is restricted strictly to **Super Admins**. You do not possess the necessary access credentials to view or modify employee access privileges.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading user directory…</p>
      </div>
    );
  }

  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const employeeCount = users.filter((u) => u.role === "employee").length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const hrCount = users.filter((u) => u.role === "hr").length;
  const payrollCount = users.filter((u) => u.role === "payroll_admin").length;

  return (
    <div className="space-y-6 font-dm-sans animate-fadeIn text-gray-800">

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FiShield className="text-[#1d4ed8]" />
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Manage granular user roles and set administrative access privileges.
          </p>
        </div>

        {/* Dynamic Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
          <div className="text-center px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
            <p className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Super Admin</p>
            <p className="text-base font-extrabold text-rose-600 dark:text-rose-300">{superAdminCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl">
            <p className="text-[9px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider">Manager</p>
            <p className="text-base font-extrabold text-purple-600 dark:text-purple-300">{managerCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <p className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Payroll Admin</p>
            <p className="text-base font-extrabold text-amber-600 dark:text-amber-300">{payrollCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl">
            <p className="text-[9px] font-bold text-teal-500 dark:text-teal-400 uppercase tracking-wider">HR Manager</p>
            <p className="text-base font-extrabold text-teal-600 dark:text-teal-300">{hrCount}</p>
          </div>
          <div className="text-center px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Employee</p>
            <p className="text-base font-extrabold text-blue-600 dark:text-blue-300">{employeeCount}</p>
          </div>
        </div>
      </div>

      {/* RBAC Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl px-4 py-3 flex items-start gap-3">
        <FiShield className="text-amber-500 shrink-0 mt-0.5" size={14} />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
          <span className="font-bold">Active Role Supervision</span> — Role updates take effect on the employee's next session. Avoid demoting all Super Admins to keep the directory accessible.
        </p>
      </div>

      {/* Search + Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search users by name, email, or role status…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-transparent focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 text-gray-800 dark:text-white transition-colors"
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="text-left px-5 py-3 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  User Profile
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Email Address
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Assigned Privilege Badge
                </th>
                <th className="text-left px-5 py-3 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Joined
                </th>
                <th className="text-right px-5 py-3 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Access Privilege Modifier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-slate-500 font-medium text-xs">
                    No users found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const meta = ROLE_META[user.role as keyof typeof ROLE_META] || ROLE_META.employee;
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

                  const isSelf = user.uid === currentUserUid;

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors group text-gray-700 dark:text-slate-300"
                    >
                      {/* Avatar + Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 border ${meta.color}`}
                          >
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white truncate">
                              {user.name || "—"}
                            </span>
                            {isSelf && (
                              <span className="text-[8px] font-black text-[#1d4ed8] dark:text-blue-400 uppercase tracking-wider">
                                Current User (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 font-medium font-mono">
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
                      <td className="px-5 py-3.5 text-gray-400 dark:text-slate-500 font-medium">
                        {joinedDate}
                      </td>

                      {/* Custom Selector Action */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-block relative">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleSelect(user, e.target.value as any)}
                            disabled={isUpdating || isSelf}
                            className={`px-3 py-1.5 text-[11px] font-bold border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors bg-white dark:bg-slate-800 text-gray-800 dark:text-white cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <option value="employee">Employee</option>
                            <option value="hr">HR Manager</option>
                            <option value="manager">Manager</option>
                            <option value="payroll_admin">Payroll Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          {isUpdating && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
                              <FiRefreshCw className="animate-spin text-blue-600" size={12} />
                            </div>
                          )}
                        </div>
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
      <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center font-medium">
        ⚠️ Changes saved directly to users collection in real-time.
      </p>

      {/* ── Granular Role Transition Confirm Modal ─────────────────── */}
      {confirmUser && targetRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-scaleUp">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400">
                <FiAlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
                  Modify Access Permissions?
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                  This will immediately change the employee's authorization permissions.
                </p>
              </div>
              <button
                onClick={() => { setConfirmUser(null); setTargetRole(null); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* User Info card */}
            <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#1d4ed8] border border-blue-100 dark:border-blue-900/30">
                {(confirmUser.name || confirmUser.email || "?")
                  .split(" ").slice(0, 2).map(n => n[0]?.toUpperCase()).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-950 dark:text-white truncate">{confirmUser.name || "—"}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate font-mono">{confirmUser.email}</p>
              </div>
            </div>

            {/* Role Transition Comparison */}
            <div className="flex items-center justify-center gap-3 bg-gray-50/50 dark:bg-slate-800/10 p-3 rounded-xl border border-dashed border-gray-100 dark:border-slate-800">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${ROLE_META[confirmUser.role as keyof typeof ROLE_META]?.color || ROLE_META.employee.color}`}>
                {confirmUser.role}
              </span>
              <span className="text-gray-300 dark:text-slate-700 font-extrabold text-sm">→</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${ROLE_META[targetRole]?.color}`}>
                {targetRole}
              </span>
            </div>

            {/* Granular description of target privileges */}
            <div className="space-y-1 bg-blue-50/40 dark:bg-blue-950/5 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/10 text-xs">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block">New Capabilities:</span>
              <p className="text-gray-600 dark:text-slate-400 text-[11px] font-medium leading-relaxed mt-0.5">
                {ROLE_META[targetRole]?.desc}
              </p>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center font-medium leading-normal">
              Note: The employee must refresh or <span className="font-bold text-gray-600 dark:text-slate-400">re-authenticate</span> for the changed parameters to take effect.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { setConfirmUser(null); setTargetRole(null); }}
                className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] shadow-sm"
              >
                Confirm Access Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
