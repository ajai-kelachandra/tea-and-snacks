"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems } from "@/features/itemsSlice";
import MenuCard from "@/components/user/MenuCard";
import CartDrawer from "@/components/user/CartDrawer";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { FiAlertCircle, FiSearch, FiShoppingCart, FiSun, FiCoffee, FiBox, FiClock } from "react-icons/fi";

type TabFilter = "all" | "beverages" | "snack";

export default function UserMenuPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.items);
  const { userName } = useAppSelector((s) => s.auth);
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  const [tab, setTab] = useState<TabFilter>("beverages");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [activeNotification, setActiveNotification] = useState<{ title: string; body: string; timestamp: any } | null>(null);
  const [showNotifyBtn, setShowNotifyBtn] = useState(false);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Function to refresh/request token
  const refreshPushToken = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('request-push-token'));
    }
  };

  useEffect(() => {
    dispatch(fetchItems());

    // Listen to ordering status
    const unsubOrdering = onSnapshot(doc(db, "settings", "ordering"), (doc) => {
      if (doc.exists()) {
        setIsOrderingEnabled(doc.data().isEnabled);
      }
    });

    // Listen to latest global notification for the banner
    const unsubNotify = onSnapshot(
      doc(db, "globalNotifications", "current"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.timestamp) {
            const sentTime = data.timestamp.toMillis ? data.timestamp.toMillis() : new Date(data.timestamp).getTime();
            const now = Date.now();

            // Show banner if notification is less than 30 minutes old
            if (now - sentTime < 1800000) {
              setActiveNotification({
                title: data.title,
                body: data.body,
                timestamp: sentTime
              });
            } else {
              setActiveNotification(null);
            }
          }
        }
      },
      (error) => {
        console.error("🔥 User Menu Notification Listener Error:", error);
      }
    );

    // Listen to timer
    const unsubTimer = onSnapshot(doc(db, "settings", "timer"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsTimerActive(data.isActive);
        setTimerEndAt(data.endAt);
      } else {
        setIsTimerActive(false);
        setTimerEndAt(null);
      }
    });

    return () => {
      unsubOrdering();
      unsubNotify();
      unsubTimer();
    };
  }, [dispatch]);

  // Countdown Logic
  useEffect(() => {
    if (!isTimerActive || !timerEndAt) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const distance = timerEndAt - now;

      if (distance < 0) {
        setTimeLeft("00:00:00");
        setIsTimerActive(false);
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, timerEndAt]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setShowNotifyBtn(Notification.permission === 'default');
    }
  }, []);

  const requestNotifyPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setShowNotifyBtn(permission === 'default');
      if (permission === 'granted') {
        refreshPushToken();
      }
    }
  };

  const activeItems = items.filter((i) => i.isActive);

  const filtered = activeItems.filter((item) => {
    const isBeverage = item.type === "tea" || item.type === "coffee";
    const matchTab =
      tab === "all" ||
      (tab === "beverages" && isBeverage) ||
      (tab === "snack" && item.type === "snack"); const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabs = [
    { id: "beverages" as TabFilter, label: "Beverages", icon: FiCoffee },
    { id: "snack" as TabFilter, label: "Snacks", icon: FiBox },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fullText = "Savor the moment...";
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Global Notification Banner */}
        {/* {activeNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mt-4 p-5 bg-[#1d4ed8] rounded-3xl flex items-start gap-4 text-white shadow-xl shadow-blue-100 border border-blue-400/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
            
            <div className="mt-1 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <FiCoffee size={20} className="text-white" />
            </div>
            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Live Announcement</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <p className="text-base font-bold mb-1 leading-tight">{activeNotification.title}</p>
              <p className="text-xs text-blue-50/80 leading-relaxed font-medium mb-3">{activeNotification.body}</p>
              
              {showNotifyBtn && (
                <button 
                  onClick={requestNotifyPermission}
                  className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 border border-white/10"
                >
                  Enable Mobile Alerts
                </button>
              )}
            </div>
          </motion.div>
        )} */}

        {/* Ordering Status Banner */}
        {!isOrderingEnabled && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
            <FiAlertCircle size={20} className="shrink-0" />
            <div>
              <p className="text-sm font-bold">Ordering is currently closed</p>
              <p className="text-xs opacity-80">The admin has disabled new orders for now. Please check back later!</p>
            </div>
          </div>
        )}

        {/* Timer/Header Section */}
        <div className="py-4 px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Greeting (always shown) */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black leading-tight">
              {greeting()}, {userName?.split(" ")[0]} 👋
            </h1>

            {/* Timer (shown on right when active) */}
            {isTimerActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-end gap-1 shrink-0"
              >
                <div className="flex items-center gap-1.5">
                  <FiClock size={13} className="animate-pulse text-orange-500" />
                  <span className="text-xl font-black tabular-nums tracking-tight text-black">
                    {timeLeft || "00:00:00"}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                  Ordering ends soon
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-8 font-dm-sans">
          {/* Large Search Bar */}


          {/* Premium Category Tabs */}
          <div className="flex justify-left gap-3 overflow-x-auto pb-4 no-scrollbar">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                id={`tab-${id}`}
                className={`shrink-0  px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 ${tab === id
                    ? "bg-[#1d4ed8] text-white shadow-lg shadow-blue-100"
                    : "bg-white text-black border border-gray-100 hover:text-[#1d4ed8] hover:border-gray-200"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Count Indicator */}
        {!loading && (
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-gray-50" />
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
              {filtered.length} Selection{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="h-[1px] flex-1 bg-gray-50" />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-44 w-full" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-8 rounded-lg mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-6xl block mb-3">🍵</span>
            <p className="text-sm font-medium">No items found.</p>
            <p className="text-xs mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} isOrderingEnabled={isOrderingEnabled} />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {totalQty > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          id="floating-cart-btn"
          className="fixed bottom-6 right-6 bg-[#1d4ed8] text-white rounded-2xl px-5 py-3.5 shadow-xl hover:bg-[#1e40af] transition-all duration-200 flex items-center gap-2.5 z-30 font-semibold text-sm hover:scale-105"
        >
          <FiShoppingCart size={17} />
          View Cart
          <span className="bg-white text-[#1d4ed8] text-xs font-bold px-2 py-0.5 rounded-full">
            {totalQty}
          </span>
        </button>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} isOrderingEnabled={isOrderingEnabled} />
    </>
  );
}
