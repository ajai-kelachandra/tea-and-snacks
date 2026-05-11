"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchOrders, updateOrderStatus, OrderStatus, setOrders, Order } from "@/features/ordersSlice";
import Badge from "@/components/ui/Badge";
import { FiSearch, FiFilter, FiClipboard, FiMessageCircle } from "react-icons/fi";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

const STATUS_OPTIONS: OrderStatus[] = ["placed", "prepared", "cancelled"];

export default function AdminOrdersPage() {
  const dispatch = useAppDispatch();
  const { orders, loading } = useAppSelector((s) => s.orders);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Order[];
      dispatch(setOrders(ordersData));
    });

    return () => unsub();
  }, [dispatch]);

  const filtered = orders.filter((order) => {
    const matchSearch =
      order.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      order.userName?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.orderNumber?.toString().includes(search);
    const matchStatus =
      filterStatus === "all" || order.status === filterStatus;
    const matchType =
      filterType === "all" ||
      (filterType === "beverages" && order.items.some((i) => i.type === "tea" || i.type === "coffee")) ||
      (filterType === "snack" && order.items.some((i) => i.type === "snack"));
    const orderDate = new Date(order.createdAt);
    const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo = !dateTo || orderDate <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchStatus && matchType && matchFrom && matchTo;
  });

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    try {
      await dispatch(updateOrderStatus({ id, status })).unwrap();
      toast.success("Order status updated.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  const handleWhatsAppShare = (order: any) => {
    const itemsList = order.items
      .map((item: any) => `- ${item.name} ×${item.quantity}`)
      .join("\n");
    
    const message = `*Order #${order.orderNumber || "—"} from ${order.userName || "Unknown"}*\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Status:* ${order.status.toUpperCase()}\n` +
      `*Time:* ${format(new Date(order.createdAt), "hh:mm a, dd MMM")}\n` +
      `*Email:* ${order.userEmail}`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {filtered.length} order{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FiFilter size={14} />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <FiSearch
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="orders-search"
              type="text"
              placeholder="Search by user or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 text-xs"
            />
          </div>
          <select
            id="orders-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field text-xs bg-white"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
          <select
            id="orders-type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field text-xs bg-white"
          >
            <option value="all">All Types</option>
            <option value="beverages">Beverages</option>
            <option value="snack">Snack</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              id="orders-date-from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field text-xs"
              placeholder="From"
            />
            <input
              type="date"
              id="orders-date-to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field text-xs"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-full rounded mb-2" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiClipboard size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No orders found.</p>
          <p className="text-xs mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {filtered.map((order, idx) => {
                  // Calculate a sequential display number based on total orders
                  // Assuming orders are sorted by date desc
                  const displayId = orders.length - orders.indexOf(order);
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-xs bg-blue-50 px-3 py-1 rounded-lg text-[#1d4ed8]">
                          #{displayId}
                        </span>
                      </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.userName || "—"}</p>
                    <p className="text-xs text-gray-400">{order.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {order.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {item.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        disabled={updating === order.id}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] cursor-pointer"
                        id={`status-${order.id}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="capitalize">
                            {s}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleWhatsAppShare(order)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send to WhatsApp"
                        id={`wa-${order.id}`}
                      >
                        <FiMessageCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
