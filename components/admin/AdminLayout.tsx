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
} from "react-icons/fi";
import toast from "react-hot-toast";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
  { href: "/admin/add-item", label: "Add Item", icon: FiPlusCircle },
  { href: "/admin/edit-items", label: "Manage Items", icon: FiList },
  { href: "/admin/orders", label: "View Orders", icon: FiClipboard },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName } = useAppSelector((s) => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem("mock_user");
    await signOut(auth);
    toast.success("Logged out successfully.");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-[#1d4ed8] rounded-lg flex items-center justify-center">
            <FiCoffee className="text-white" size={18} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Iro Snacks</p>
            <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1 overflow-y-auto min-h-0">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${active
                    ? "bg-[#1d4ed8] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout - Pushed to bottom */}
        <div className="mt-auto px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-800"
            onClick={() => setSidebarOpen(true)}
            id="sidebar-toggle"
          >
            <FiMenu size={22} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 hidden sm:block capitalize">
              Welcome back, {userName || "Admin"}!
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1d4ed8] text-white text-xs font-bold flex items-center justify-center">
              {(userName?.[0] || "A").toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 hidden md:block font-medium capitalize">
              {userName || "Admin"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fadeIn">{children}</main>
      </div>
    </div>
  );
}
