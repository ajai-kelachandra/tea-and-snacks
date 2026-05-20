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
  FiMessageCircle,
  FiClock,
  FiTrash2,
  FiActivity,
  FiPackage,
  FiCheckCircle,
} from "react-icons/fi";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { calculateOrderCharges } from "@/lib/orderUtils";

export default function TeaSnackDashboardPage() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.items);
  const { orders } = useAppSelector((s) => s.orders);

  // Broadcaster / Modal States
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("Tea & Snack Time! ☕");
  const [notifyMessage, setNotifyMessage] = useState("Fresh tea and snacks are ready at the counter. Come and get yours!");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Timer States
  const [timerMinutes, setTimerMinutes] = useState("30");
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerEndAt, setTimerEndAt] = useState<any>(null);

  // Ordering States
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [isUpdatingEnabled, setIsUpdatingEnabled] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

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
      
      // Filter out cleared orders for dashboard view
      const activeOrders = ordersData.filter((order) => !order.isCleared);
      dispatch(setOrders(activeOrders));
    });

    // Listen to ordering status
    const unsubOrdering = onSnapshot(doc(db, "settings", "ordering"), (doc) => {
      if (doc.exists()) {
        setIsOrderingEnabled(doc.data().isEnabled);
      }
    });

    // Listen to ordering timer
    const unsubTimer = onSnapshot(doc(db, "settings", "timer"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsTimerActive(data.isActive);
        setTimerEndAt(data.endAt);
      }
    });

    return () => {
      unsubOrders();
      unsubOrdering();
      unsubTimer();
    };
  }, [dispatch]);

  const handleStartTimer = async () => {
    const mins = parseInt(timerMinutes);
    if (isNaN(mins) || mins <= 0) return;

    const endAt = Date.now() + (mins * 60000);
    await setDoc(doc(db, "settings", "timer"), {
      isActive: true,
      endAt: endAt,
      startedAt: serverTimestamp()
    });
    toast.success(`Timer started for ${mins} minutes!`);
  };

  const handleStopTimer = async () => {
    await setDoc(doc(db, "settings", "timer"), {
      isActive: false,
      endAt: null
    });
    toast.success("Timer stopped.");
  };

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

  const handleClearAllOrders = async () => {
    setIsClearing(true);
    try {
      const { writeBatch } = await import("firebase/firestore");
      const ordersSnapshot = await getDocs(collection(db, "orders"));

      // Filter docs that are not yet cleared
      const unclearedDocs = ordersSnapshot.docs.filter((d) => !d.data().isCleared);

      if (unclearedDocs.length === 0) {
        toast.success("No orders to clear!");
        setIsClearModalOpen(false);
        return;
      }

      const batch = writeBatch(db);
      unclearedDocs.forEach((d) => {
        batch.update(d.ref, { isCleared: true });
      });

      await batch.commit();
      toast.success("All orders cleared successfully! 🧹");
      setIsClearModalOpen(false);
    } catch (err) {
      console.error("Clear orders failed:", err);
      toast.error("Failed to clear orders.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleBroadcast = async () => {
    if (!notifyMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      await setDoc(doc(db, "globalNotifications", "current"), {
        title: notifyTitle,
        body: notifyMessage,
        timestamp: serverTimestamp(),
      });

      try {
        const res = await fetch("/api/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: notifyTitle, body: notifyMessage }),
        });
        
        const result = await res.json();
        if (result.success) {
          toast.success(`Broadcasted! Reached ${result.sentCount} devices.`, {
            icon: '🚀',
            duration: 5000
          });
        }
      } catch (pushErr) {
        console.error("FCM API call failed:", pushErr);
      }

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

  // Stats Counters
  const placedOrders = orders.filter((o) => o.status === "placed").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

  const snackStats = [
    { label: "Total Orders", value: orders.length, icon: FiClipboard, color: "text-blue-600 bg-blue-50" },
    { label: "Placed Orders", value: placedOrders, icon: FiPackage, color: "text-amber-600 bg-amber-50" },
    { label: "Cancelled Orders", value: cancelledOrders, icon: FiTrash2, color: "text-red-600 bg-red-50" },
  ];

  const recentOrders = orders.slice(0, 10);
  const orderCharges = calculateOrderCharges(orders);

  return (
    <div className="space-y-6 font-dm-sans">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Tea & Snack Operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage live snacking queues, timers, and broadcast notifications.</p>
        </div>
      </div>

      {/* Snacking Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {snackStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 border border-gray-100 shadow-sm bg-white flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
              <p className="text-3xl font-black text-gray-900 mt-2">{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
          </div>
        ))}

        {/* Clear Orders & Ordering Enable Toggle (Unified 4th Grid Slot - Top & Bottom stacked inside one single card) */}
        <div className="card p-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between gap-3 min-h-[105px]">
          {/* Ordering Enabled toggle (Top) */}
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ordering Status</span>
              <span className={`text-[10px] font-black uppercase tracking-tight ${isOrderingEnabled ? "text-green-600" : "text-red-600"}`}>
                {isOrderingEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <button
              onClick={toggleOrdering}
              disabled={isUpdatingEnabled}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isOrderingEnabled ? "bg-green-500" : "bg-gray-200"}`}
            >
              <span className={`${isOrderingEnabled ? "translate-x-5" : "translate-x-1"} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} />
            </button>
          </div>

          {/* Clear All Orders Button (Bottom) */}
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 transition-all duration-155 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <FiTrash2 size={12} />
            Clear All Orders
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="space-y-6">
        
        {/* Quick Actions / Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Broadcast widget */}
          <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <FiMessageCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Broadcaster Alert</h3>
                <p className="text-[10px] text-gray-500 font-medium">Alert employees on device screens</p>
              </div>
            </div>
            <button
              onClick={() => setIsNotifyModalOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-100"
            >
              Send Direct Alert
            </button>
          </div>

          {/* Ordering Timer widget */}
          <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isTimerActive ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-gray-50 text-gray-400'}`}>
                <FiClock size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Ordering Deadline</h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  {isTimerActive ? "Countdown active" : "Auto disable ordering"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isTimerActive ? (
                <>
                  <input 
                    type="number"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(e.target.value)}
                    className="w-20 bg-gray-50 border border-gray-100 rounded-xl px-3 text-xs font-bold outline-none focus:border-blue-200"
                    placeholder="Mins"
                  />
                  <button
                    onClick={handleStartTimer}
                    className="flex-1 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                  >
                    Start Timer
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStopTimer}
                  className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                >
                  Stop Timer
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Recent Orders Queue */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Active Orders Queue</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Recently placed tea and snack orders</p>
            </div>
            <button
              onClick={handleBulkWhatsApp}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-700 transition-colors cursor-pointer"
            >
              <FiMessageCircle size={13} />
              WhatsApp Summary
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FiClipboard size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">No active orders in the queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Requested Items</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Extra Charge</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => {
                    const charges = orderCharges[order.id] || { items: order.items.map((i: any) => ({ ...i, billableQty: 0 })), extraCharge: 0 };
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/20">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-xs">{order.userName || order.userEmail}</p>
                          <p className="text-[10px] text-gray-400">{order.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {charges.items.map((i, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full ${
                                  i.billableQty > 0
                                    ? "bg-red-50 text-red-700 border border-red-100 font-bold"
                                    : "bg-gray-100 text-gray-700 font-medium"
                                }`}
                              >
                                {i.name} ×{i.quantity}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold">
                          {charges.extraCharge > 0 ? (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[10px]">
                              ₹{charges.extraCharge}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              order.status === "placed"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Broadcast Modal */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNotifyModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Broadcast Alert</h3>
            <div className="space-y-4 mb-6">
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
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting || !notifyMessage.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1d4ed8] text-white text-xs font-bold hover:bg-[#1e40af] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Clear All Orders Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsClearModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <FiTrash2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Clear All Orders</h3>
            </div>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
              Are you sure you want to clear all orders? This will delete all order history and cannot be undone. This operation will clear the entire active orders queue.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllOrders}
                disabled={isClearing}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-100"
              >
                {isClearing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiTrash2 size={14} />
                    Clear Orders
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
