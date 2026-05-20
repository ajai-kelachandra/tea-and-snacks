"use client";

interface BadgeProps {
  type: "tea" | "coffee" | "snack" | "active" | "inactive" | "placed" | "cancelled";
  label?: string;
}

const config: Record<string, string> = {
  tea: "bg-green-100 text-green-800",
  coffee: "bg-amber-100 text-amber-800",
  snack: "bg-orange-100 text-orange-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  placed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const labels: Record<string, string> = {
  tea: "Tea",
  coffee: "Coffee",
  snack: "Snack",
  active: "Active",
  inactive: "Inactive",
  placed: "Placed",
  cancelled: "Cancelled",
};

export default function Badge({ type, label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config[type] || "bg-gray-100 text-gray-600"}`}
    >
      {label || labels[type] || type}
    </span>
  );
}
