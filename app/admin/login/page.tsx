"use client";

import LoginForm from "@/components/LoginForm";
import { FiCoffee, FiShield } from "react-icons/fi";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1d4ed8] px-8 py-8 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <FiCoffee size={28} />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Tea & Snacks</h1>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-blue-200">
              <FiShield size={13} />
              <p className="text-sm">Admin / HR Portal</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">
              Access the admin panel to manage items and view orders.
            </p>
            <LoginForm role="admin" redirectTo="/admin/dashboard" />
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              Not an admin?{" "}
              <Link
                href="/user/login"
                className="text-[#1d4ed8] font-semibold hover:underline"
              >
                Employee login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
