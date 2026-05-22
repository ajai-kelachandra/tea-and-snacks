"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppSelector } from "@/lib/hooks";
import {
  FiGrid,
  FiPlusCircle,
  FiList,
  FiClipboard,
  FiLogOut,
  FiMenu,
  FiX,
  FiCoffee,
  FiUsers,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiSun,
  FiMoon,
  FiShield,
  FiMessageSquare,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Footer from "@/components/Footer";
import { useTheme } from "@/components/ThemeProvider";

const navLinks = [
  { href: "/admin/tea-snack", label: "Snack Dashboard", icon: FiCoffee },
  { href: "/admin/add-item", label: "Add Item", icon: FiPlusCircle },
  { href: "/admin/edit-items", label: "Manage Items", icon: FiList },
  { href: "/admin/orders", label: "View Orders", icon: FiClipboard },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName } = useAppSelector((s) => s.auth);
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teaSnackOpen, setTeaSnackOpen] = useState(true);

  const handleLogout = async () => {
    localStorage.removeItem("mock_user");
    await signOut(auth);
    toast.success("Logged out successfully.");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 border-r border-[var(--border)] z-40 flex flex-col transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto`}
        style={{ backgroundColor: "var(--bg-sidebar)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
          <div className="w-9 h-9 bg-[#1d4ed8] rounded-lg flex items-center justify-center">
            <FiUsers className="text-white" size={18} />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm leading-none">IRO People</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Admin Panel</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-3 overflow-y-auto min-h-0">
          {/* Main Dashboard Category */}
          <div className="space-y-1">
            <Link
              href="/admin/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/dashboard"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiGrid size={15} />
              <span>Main Dashboard</span>
            </Link>
          </div>

          {/* Tea & Snack Category */}
          <div className="space-y-1">
            <button
              onClick={() => setTeaSnackOpen(!teaSnackOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FiCoffee size={15} />
                <span>Tea & Snack</span>
              </div>
              {teaSnackOpen ? <FiChevronUp size={12} className="text-gray-400" /> : <FiChevronDown size={12} className="text-gray-400" />}
            </button>

            {teaSnackOpen && (
              <div className="space-y-1 pl-1.5 animate-fadeIn">
                {navLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors duration-150
                        ${active
                          ? "bg-[#1d4ed8] text-white shadow-sm"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                      <Icon size={14} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employees Category */}
          <div className="space-y-1">
            <Link
              href="/admin/employees"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/employees"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiUsers size={15} />
              <span>Employees</span>
            </Link>
          </div>

          {/* Leave & Attendance Category */}
          <div className="space-y-1">
            <Link
              href="/admin/attendance"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/attendance"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiCalendar size={15} />
              <span>Leave & Attendance</span>
            </Link>
          </div>

          {/* Jira Tasks Category */}
          <div className="space-y-1">
            <Link
              href="/admin/tasks"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/tasks"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiList size={15} />
              <span>Jira Tasks</span>
            </Link>
          </div>

          {/* Role Management Category */}
          <div className="space-y-1">
            <Link
              href="/admin/roles"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/roles"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiShield size={15} />
              <span>Role Management</span>
            </Link>
          </div>

          {/* Real-time Messaging Category */}
          <div className="space-y-1">
            <Link
              href="/admin/chat"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150
                ${pathname === "/admin/chat"
                  ? "bg-[#1d4ed8] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
            >
              <FiMessageSquare size={15} />
              <span>Direct Messaging</span>
            </Link>
          </div>
        </nav>

        {/* Logout - Pushed to bottom */}
        <div className="mt-auto px-3 py-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
            id="admin-logout-btn"
          >
            <FiLogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="border-b border-[var(--border)] px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-20 transition-colors" style={{ backgroundColor: "var(--bg-header)" }}>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-800"
            onClick={() => setSidebarOpen(true)}
            id="sidebar-toggle"
          >
            <FiMenu size={22} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] hidden sm:block capitalize">
              Welcome back, {userName || "Admin"}!
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-secondary)] transition-all active:scale-95"
            >
              {theme === "dark"
                ? <FiSun size={14} className="text-amber-400" />
                : <FiMoon size={14} className="text-slate-500" />
              }
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white text-xs font-bold flex items-center justify-center">
              {(userName?.[0] || "A").toUpperCase()}
            </div>
            <span className="text-sm text-[var(--text-secondary)] hidden md:block font-medium capitalize">
              {userName || "Admin"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fadeIn">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
