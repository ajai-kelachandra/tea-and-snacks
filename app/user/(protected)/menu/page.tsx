"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchItems } from "@/features/itemsSlice";
import { setOrders, Order } from "@/features/ordersSlice";
import MenuCard from "@/components/user/MenuCard";
import CartDrawer from "@/components/user/CartDrawer";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { 
  FiAlertCircle, 
  FiSearch, 
  FiShoppingCart, 
  FiSun, 
  FiCoffee, 
  FiBox, 
  FiClock, 
  FiUser, 
  FiPlus
} from "react-icons/fi";
import { addToCart } from "@/features/cartSlice";
import toast from "react-hot-toast";

type TabFilter = "all" | "beverages" | "snack";

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
}

export default function UserMenuPage() {
  const dispatch = useAppDispatch();
  const { items, loading: itemsLoading } = useAppSelector((s) => s.items);
  const { userName, userEmail, uid } = useAppSelector((s) => s.auth);
  const { orders } = useAppSelector((s) => s.orders);
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Custom states
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("beverages");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [isOrderingEnabled, setIsOrderingEnabled] = useState(true);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [activeSession, setActiveSession] = useState<"morning" | "evening">("morning");

  // 1. Fetch employee profile matching the logged-in email
  useEffect(() => {
    if (!userEmail) return;

    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const match = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as any))
          .find((emp) => emp.email?.toLowerCase() === userEmail.toLowerCase());

        if (match) {
          setEmployee(match);
        }
        setEmployeeLoading(false);
      },
      (err) => {
        console.error("Failed to load employee details:", err);
        setEmployeeLoading(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  // 2. Fetch/listen to items, orders, settings, and timers
  useEffect(() => {
    dispatch(fetchItems());

    const hour = new Date().getHours();
    setActiveSession(hour < 12 ? "morning" : "evening");

    // Listen to ordering status
    const unsubOrdering = onSnapshot(doc(db, "settings", "ordering"), (doc) => {
      if (doc.exists()) {
        setIsOrderingEnabled(doc.data().isEnabled);
      }
    });

    // Listen to timer settings
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

    // Listen to orders to count daily pantry limit dynamically
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Order[];
      dispatch(setOrders(ordersData));
    });

    return () => {
      unsubOrdering();
      unsubTimer();
      unsubOrders();
    };
  }, [dispatch]);

  // 3. Countdown timer logic
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

  // 4. Calculate today's pantry refreshment consumption
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const myTodayOrders = orders.filter(
    (o) => 
      o.userId === uid && 
      o.status !== "cancelled" && 
      !o.isCleared && 
      new Date(o.createdAt).getTime() >= startOfToday.getTime()
  );

  let itemsConsumedToday = 0;
  myTodayOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.type === "tea" || item.type === "snack" || item.type === "coffee") {
        itemsConsumedToday += item.quantity;
      }
    });
  });

  const dailyFreeLimit = 2;
  const remainingAllowances = Math.max(0, dailyFreeLimit - itemsConsumedToday);

  // 5. Gather last 4 distinct recently ordered items for Quick Reorder
  const recentOrders = orders
    .filter((o) => o.userId === uid && o.status !== "cancelled")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentItems: { id: string; name: string; type: any; imageUrl: string }[] = [];
  const activeItems = items.filter((i) => i.isActive);

  recentOrders.forEach((o) => {
    o.items.forEach((oi) => {
      const matched = activeItems.find((ai) => ai.id === oi.itemId);
      if (matched && recentItems.length < 4 && !recentItems.some((ri) => ri.id === matched.id)) {
        if (matched.timeSlot === activeSession || matched.timeSlot === "all-day") {
          recentItems.push({
            id: matched.id,
            name: matched.name,
            type: matched.type,
            imageUrl: matched.imageUrl,
          });
        }
      }
    });
  });

  const handleQuickReorder = (item: { id: string; name: string; type: any; imageUrl: string }) => {
    if (!isOrderingEnabled) {
      toast.error("Pantry ordering is currently closed.");
      return;
    }
    dispatch(addToCart({ id: item.id, name: item.name, type: item.type, imageUrl: item.imageUrl }));
    toast.success(`${item.name} added!`, { duration: 1200 });
  };

  // 6. Filtering items by session slot
  const sessionItems = activeItems.filter((item) => {
    return item.timeSlot === activeSession || item.timeSlot === "all-day" || !item.timeSlot;
  });

  const filtered = sessionItems.filter((item) => {
    const isBeverage = item.type === "tea" || item.type === "coffee";
    const matchTab =
      tab === "all" ||
      (tab === "beverages" && isBeverage) ||
      (tab === "snack" && item.type === "snack");
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <>
      <div className="space-y-6 pb-12 font-dm-sans text-gray-800">
        
        {/* Closed/Warning Notification Banner - Extremely Clean & Flat */}
        {!isOrderingEnabled && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-xs">
            <FiAlertCircle size={16} className="shrink-0 text-red-500" />
            <p className="font-medium">
              <strong>Ordering Closed</strong> — The pantry is currently suspended. New bookings are locked.
            </p>
          </div>
        )}

        {/* Clean Minimalist Corporate Header Row */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pantry Perks</h1>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {employee ? `${employee.name} • ${employee.jobTitle} (${employee.department})` : userName || "Office Staff"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs border-t md:border-t-0 md:border-l border-gray-150 pt-4 md:pt-0 md:pl-6">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Allowance</span>
              <p className="font-semibold text-gray-900">
                {remainingAllowances} of 2 free slots remaining
                {itemsConsumedToday > 2 && (
                  <span className="text-red-600 font-bold ml-1.5">(Extra charges: ₹{(itemsConsumedToday - 2) * 12})</span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Active Shift Slot</span>
              <p className="font-semibold text-gray-900 flex items-center gap-1.5 capitalize">
                {activeSession} session
                {isTimerActive && (
                  <span className="text-amber-600 font-bold ml-1">({timeLeft})</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Minimalist Tab Bar & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-px">
          
          {/* Underlined Navigation Tabs (GitHub/Slack-like minimalist styling) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setTab("beverages")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative ${
                tab === "beverages"
                  ? "border-[#1d4ed8] text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Beverages
            </button>
            <button
              onClick={() => setTab("snack")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative ${
                tab === "snack"
                  ? "border-[#1d4ed8] text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Snacks & Eatables
            </button>
          </div>

          {/* Simple Clean Search Input */}
          <div className="relative w-full sm:max-w-xs pb-2 sm:pb-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search pantry menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent transition-all placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tiny Space-saving Quick Reorder Tags */}
        {recentItems.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 text-xs py-1">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px] mr-1">Quick Picks:</span>
            {recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleQuickReorder(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/10 rounded-full text-xs font-medium text-gray-600 hover:text-blue-600 transition-all active:scale-[0.98]"
              >
                <FiPlus size={10} />
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Count Indicator */}
        {!itemsLoading && (
          <div className="flex items-center gap-3 pt-2">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
              Available refreshments ({filtered.length})
            </p>
            <div className="h-[1px] flex-1 bg-gray-100" />
          </div>
        )}

        {/* Clean Items Grid */}
        {itemsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4 animate-pulse">
                <div className="h-40 w-full bg-gray-100 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                  <div className="h-3 w-full bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <p className="text-sm font-bold text-gray-400">No refreshments currently available</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              No items match this filter category in the current active slot.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <MenuCard 
                key={item.id} 
                item={item} 
                isOrderingEnabled={isOrderingEnabled} 
              />
            ))}
          </div>
        )}

      </div>

      {/* Elegant Flat Floating Cart Basket */}
      {totalQty > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          id="floating-cart-btn"
          className="fixed bottom-6 right-6 bg-[#1d4ed8] text-white rounded-xl px-5 py-3.5 shadow-lg hover:bg-[#1e40af] transition-all flex items-center gap-2.5 z-30 font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95"
        >
          <FiShoppingCart size={14} />
          Basket
          <span className="bg-white text-[#1d4ed8] text-[10px] px-2 py-0.5 rounded-full font-black">
            {totalQty}
          </span>
        </button>
      )}

      <CartDrawer 
        open={cartOpen} 
        onClose={() => setCartOpen(false)} 
        isOrderingEnabled={isOrderingEnabled} 
      />
    </>
  );
}
