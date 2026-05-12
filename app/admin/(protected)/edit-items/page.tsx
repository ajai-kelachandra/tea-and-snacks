"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems, updateItem, deleteItem, TeaSnackItem } from "@/features/itemsSlice";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { FiEdit2, FiSearch, FiPlus, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";

export default function EditItemsPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.items);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const isBeverage = item.type === "tea" || item.type === "coffee";
    const matchType = 
      filterType === "all" || 
      (filterType === "beverages" && isBeverage) || 
      (filterType === "snack" && item.type === "snack");
    return matchSearch && matchType;
  });

  const handleToggle = async (item: TeaSnackItem) => {
    setToggling(item.id);
    try {
      await dispatch(
        updateItem({ id: item.id, data: { isActive: !item.isActive } })
      ).unwrap();
      toast.success(
        item.isActive ? "Item deactivated." : "Item is now active."
      );
    } catch {
      toast.error("Failed to update item.");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (item: TeaSnackItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteItem(item.id)).unwrap();
      toast.success("Item deleted successfully.");
    } catch {
      toast.error("Failed to delete item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Itemsssss</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/admin/add-item">
          <Button variant="primary" icon={<FiPlus size={15} />} id="add-item-btn">
            Add New Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            id="items-search"
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["all", "beverages", "snack"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors duration-150 ${
                filterType === t
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Items table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex gap-4 items-center">
              <div className="skeleton w-14 h-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-sm">No items found.</p>
          <Link
            href="/admin/add-item"
            className="text-[#1d4ed8] text-sm font-medium mt-2 inline-block hover:underline"
          >
            Add your first item →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Time Slot
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/48x48/f3f4f6/9ca3af?text=?";
                        }}
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-[180px]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge type={item.type} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-500 capitalize">
                      {item.timeSlot || "all-day"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(item)}
                      disabled={toggling === item.id}
                      className={`relative w-10 h-5.5 rounded-full transition-colors duration-300 focus:outline-none
                        ${item.isActive ? "bg-[#1d4ed8]" : "bg-gray-300"}`}
                      title={item.isActive ? "Click to deactivate" : "Click to activate"}
                      id={`toggle-${item.id}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                          item.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/edit-items/${item.id}`}
                        id={`edit-${item.id}`}
                      >
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1d4ed8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150">
                          <FiEdit2 size={12} />
                          Edit
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                        title="Delete Item"
                        id={`delete-${item.id}`}
                      >
                        <FiTrash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
