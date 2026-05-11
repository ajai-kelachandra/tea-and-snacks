"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import UserHeader from "@/components/user/UserHeader";

export default function UserProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { isLoggedIn, userRole, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/user/login");
    } else if (userRole === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [isLoggedIn, userRole, loading, router]);

  if (loading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
