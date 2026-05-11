"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems } from "@/features/itemsSlice";
import { useParams, useRouter } from "next/navigation";
import ItemForm from "@/components/admin/ItemForm";
import { FiArrowLeft } from "react-icons/fi";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, loading } = useAppSelector((s) => s.items);
  const item = items.find((i) => i.id === id);

  useEffect(() => {
    if (items.length === 0) {
      dispatch(fetchItems());
    }
  }, [dispatch, items.length]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 space-y-4">
          <div className="skeleton h-6 w-1/3 rounded" />
          <div className="skeleton h-10 rounded" />
          <div className="skeleton h-10 rounded" />
          <div className="skeleton h-24 rounded" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto card p-10 text-center">
        <p className="text-gray-500">Item not found.</p>
        <button
          onClick={() => router.push("/admin/edit-items")}
          className="text-[#1d4ed8] text-sm font-medium mt-2 hover:underline"
        >
          Back to items
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          id="back-btn"
        >
          <FiArrowLeft size={15} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Update the details for <span className="font-semibold">{item.name}</span>.
        </p>
      </div>
      <div className="card p-6">
        <ItemForm mode="edit" initialData={item} />
      </div>
    </div>
  );
}
