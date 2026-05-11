"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { isLoggedIn, userRole, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn || userRole !== "admin") {
      router.replace("/admin/login");
    }
  }, [isLoggedIn, userRole, loading, router]);

  if (loading || !isLoggedIn || userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Verifying access…</p>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
