"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems } from "@/features/itemsSlice";
import MenuCard from "@/components/user/MenuCard";
import CartDrawer from "@/components/user/CartDrawer";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { FiAlertCircle, FiSearch, FiShoppingCart, FiSun, FiCoffee, FiBox } from "react-icons/fi";

type TabFilter = "all" | "beverages" | "snack";

export default function UserMenuPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.items);
  const { userName } = useAppSelector((s) => s.auth);
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [activeNotification, setActiveNotification] = useState<{ title: string; body: string; timestamp: any } | null>(null);
  const [showNotifyBtn, setShowNotifyBtn] = useState(false);

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

    return () => {
      unsubOrdering();
      unsubNotify();
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setShowNotifyBtn(Notification.permission === 'default');
    }
  }, []);

  const requestNotifyPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setShowNotifyBtn(permission === 'default');
    }
  };

  const activeItems = items.filter((i) => i.isActive);

  const filtered = activeItems.filter((item) => {
    const isBeverage = item.type === "tea" || item.type === "coffee";
    const matchTab = 
      tab === "all" || 
      (tab === "beverages" && isBeverage) || 
      (tab === "snack" && item.type === "snack");    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabs = [
    { id: "all" as TabFilter, label: "All", icon: FiSun },
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
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleType = () => {
      const current = displayText;
      const shouldDelete = isDeleting;
      
      setDisplayText(
        shouldDelete 
          ? fullText.substring(0, current.length - 1) 
          : fullText.substring(0, current.length + 1)
      );

      setTypingSpeed(shouldDelete ? 100 : 150);

      if (!shouldDelete && current === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (shouldDelete && current === "") {
        setIsDeleting(false);
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingSpeed]);

  return (
    <>
      <div className="space-y-6">
        {/* Global Notification Banner */}
        {activeNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mt-4 p-5 bg-[#1d4ed8] rounded-3xl flex items-start gap-4 text-white shadow-xl shadow-blue-100 border border-blue-400/20 relative overflow-hidden group"
          >
            {/* Decorative background element */}
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
        )}

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

        {/* Quote Section */}
        <div className="py-5 px-6 text-left">
          <div className="flex flex-col items-start justify-start gap-8">
            <div className="space-y-2 font-dm-sans min-h-[120px] flex items-center justify-start">
              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-8xl font-black tracking-tight text-black leading-tight"
              >
                {displayText}
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="inline-block w-2 lg:w-4 h-10 lg:h-20 bg-[#1d4eb8] ml-2 align-middle"
                />
              </motion.h1>
            </div>

           
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="space-y-8 font-dm-sans">
          {/* Large Search Bar */}
          <div className="relative group max-w-2xl mx-auto">
            <FiSearch
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
            />
            <input
              type="text"
              id="menu-search"
              placeholder="Search for something delicious…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 h-16 pl-14 pr-6 rounded-[24px] text-sm font-medium shadow-sm group-hover:shadow-md focus:shadow-xl focus:shadow-blue-50 outline-none transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Premium Category Tabs */}
          <div className="flex justify-center gap-3 overflow-x-auto pb-4 no-scrollbar">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                id={`tab-${id}`}
                className={`shrink-0  px-8 py-3 rounded-full text-[10px] font-medium uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 ${
                  tab === id
                    ? "bg-[#1d4ed8] text-white shadow-lg shadow-blue-100"
                    : "bg-white text-gray-400 border border-gray-100 hover:text-[#1d4ed8] hover:border-gray-200"
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
