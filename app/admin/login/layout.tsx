import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | Iro Snacks",
  description: "HR & Admin portal login for Tea & Snacks booking system.",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
