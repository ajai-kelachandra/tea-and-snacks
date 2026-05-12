"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems } from "@/features/itemsSlice";
import { fetchOrders, setOrders, Order } from "@/features/ordersSlice";
import Link from "next/link";
import {
  FiPlusCircle,
  FiList,
  FiClipboard,
  FiPackage,
  FiCheckCircle,
  FiActivity,
  FiMessageCircle,
} from "react-icons/fi";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, onSnapshot, getDoc, collection, query, orderBy } from "firebase/firestore";

export default function AdminDashboardPage() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.items);
  const { orders } = useAppSelector((s) => s.orders);
  const { userName } = useAppSelector((s) => s.auth);

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("Iro Snacks 🥨");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [isUpdatingEnabled, setIsUpdatingEnabled] = useState(false);

  useEffect(() => {
    dispatch(fetchItems());
    
    // Real-time orders listener
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Order[];
      dispatch(setOrders(ordersData));
    });

    // Listen to ordering status
    const unsubOrdering = onSnapshot(doc(db, "settings", "ordering"), (doc) => {
      if (doc.exists()) {
        setIsOrderingEnabled(doc.data().isEnabled);
      }
    });

    return () => {
      unsubOrders();
      unsubOrdering();
    };
  }, [dispatch]);

  const toggleOrdering = async () => {
    setIsUpdatingEnabled(true);
    try {
      await setDoc(doc(db, "settings", "ordering"), {
        isEnabled: !isOrderingEnabled,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Ordering ${!isOrderingEnabled ? "enabled" : "disabled"}`);
    } catch (err) {
      console.error("Toggle failed:", err);
      toast.error("Failed to update ordering status");
    } finally {
      setIsUpdatingEnabled(false);
    }
  };

  const handleBroadcast = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      await setDoc(doc(db, "globalNotifications", "current"), {
        title: notifyTitle,
        body: notifyMessage,
        timestamp: serverTimestamp(),
      });
      toast.success("Notification broadcasted successfully!");
      setNotifyMessage("");
      setIsNotifyModalOpen(false);
    } catch (err) {
      console.error("Broadcast failed:", err);
      toast.error("Failed to broadcast message.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleBulkWhatsApp = () => {
    const pendingOrders = orders.filter(o => o.status === "placed");
    
    if (pendingOrders.length === 0) {
      alert("No pending orders to share!");
      return;
    }

    // Aggregate counts for all items across all pending orders
    const summary: Record<string, number> = {};
    pendingOrders.forEach(order => {
      order.items.forEach(item => {
        summary[item.name] = (summary[item.name] || 0) + item.quantity;
      });
    });

    const itemsList = Object.entries(summary)
      .map(([name, qty]) => `• *${name}*: ${qty} qty`)
      .join("\n");

    const message = `🔥 *ORDERS SUMMARY* 🔥\n` +
      `📅 Date: ${format(new Date(), "dd MMM, yyyy")}\n` +
      `--------------------------\n` +
      `${itemsList}\n` +
      `--------------------------\n` +
      `✅ Total Pending: ${pendingOrders.length} orders`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const activeItems = items.filter((i) => i.isActive).length;
  const totalOrders = orders.length;
  const placedOrders = orders.filter((o) => o.status === "placed").length;
  const teas = items.filter((i) => i.type === "tea").length;
  const coffees = items.filter((i) => i.type === "coffee").length;
  const snacks = items.filter((i) => i.type === "snack").length;

  const stats = [
    {
      label: "Total Items",
      value: items.length,
      icon: FiPackage,
      color: "bg-blue-50 text-[#1d4ed8]",
      description: `${activeItems} active`,
    },
    {
      label: "Total Orders",
      value: totalOrders,
      icon: FiClipboard,
      color: "bg-purple-50 text-purple-700",
      description: `${placedOrders} pending`,
    },
    {
      label: "Active Items",
      value: activeItems,
      icon: FiCheckCircle,
      color: "bg-green-50 text-green-700",
      description: "currently available",
    },
    {
      label: "Categories",
      value: 3,
      icon: FiActivity,
      color: "bg-amber-50 text-amber-700",
      description: `${teas} tea · ${coffees} coffee · ${snacks} snack`,
    },
  ];

  const quickLinks = [
    {
      href: "/admin/add-item",
      icon: FiPlusCircle,
      label: "Add New Item",
      description: "Create a tea, coffee or snack",
      color: "bg-[#1d4ed8] text-white hover:bg-[#1e40af]",
    },
    {
      href: "/admin/edit-items",
      icon: FiList,
      label: "Manage Items",
      description: "Edit, activate or deactivate",
      color: "bg-white border border-gray-200 text-gray-900 hover:border-[#1d4ed8]",
    },
    {
      href: "/admin/orders",
      icon: FiClipboard,
      label: "View Orders",
      description: "See all placed orders",
      color: "bg-white border border-gray-200 text-gray-900 hover:border-[#1d4ed8]",
    },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboardss</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hello, {userName?.split("@")[0] || "Admin"}! Here's an overview of today's activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNotifyModalOpen(true)}
            className="flex items-center gap-2 bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1e40af] transition-all active:scale-95 shadow-lg shadow-blue-100"
          >
            <FiMessageCircle size={14} />
            Notify People
          </button>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ordering</span>
              <span className={`text-[10px] font-bold uppercase tracking-tight ${isOrderingEnabled ? "text-green-600" : "text-red-600"}`}>
                {isOrderingEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <button
              onClick={toggleOrdering}
              disabled={isUpdatingEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isOrderingEnabled ? "bg-green-500" : "bg-gray-200"
              } ${isUpdatingEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`${
                  isOrderingEnabled ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notify Modal */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isBroadcasting && setIsNotifyModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1d4ed8]">
                <FiMessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Broadcast Message</h3>
                <p className="text-xs text-gray-500">This will notify all active users</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder="Notification Title"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                  disabled={isBroadcasting}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1.5 block">Message</label>
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="e.g. Fresh Tea and Snacks are served! 🥨☕"
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none placeholder:text-gray-400"
                  disabled={isBroadcasting}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                disabled={isBroadcasting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting || !notifyMessage.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1d4ed8] text-white text-xs font-bold hover:bg-[#1e40af] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isBroadcasting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiMessageCircle size={14} />
                    Send Alert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, description }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map(({ href, icon: Icon, label, description, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 shadow-sm ${color}`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-70">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBulkWhatsApp}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors"
            >
              <FiMessageCircle size={14} />
              Share Summary
            </button>
            <Link
              href="/admin/orders"
              className="text-xs text-[#1d4ed8] font-medium hover:underline"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="card overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FiClipboard size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No orders yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.userName || order.userEmail}</p>
                      <p className="text-xs text-gray-400">{order.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-gray-600 text-xs">
                        {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          order.status === "placed"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "prepared"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
