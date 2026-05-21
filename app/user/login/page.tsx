"use client";

import LoginForm from "@/components/LoginForm";
import { FiUser, FiUsers } from "react-icons/fi";
import Link from "next/link";

export default function UserLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="px-8 py-8 text-center border-b border-gray-100">

            <div className="flex items-center justify-center gap-1.5 mt-1 text-gray-500">
              <FiUser size={13} />
              <p className="text-sm">Employee Portal</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sign in to manage leaves, view attendance, and order tea & snacks.
            </p>
            <LoginForm role="user" redirectTo="/user/menu" />
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              Admin or HR?{" "}
              <Link
                href="/admin/login"
                className="text-[#1d4ed8] font-semibold hover:underline"
              >
                Admin login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
