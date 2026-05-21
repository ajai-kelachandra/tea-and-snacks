"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, userRole, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn) {
      const isAdminRole = userRole && userRole !== "employee";
      router.replace(isAdminRole ? "/admin/dashboard" : "/user/menu");
    } else {
      router.replace("/user/login");
    }
  }, [isLoggedIn, userRole, loading, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading…</p>
      </div>
    </div>
  );
}
