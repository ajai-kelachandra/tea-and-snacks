"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { 
  FiCoffee, 
  FiCalendar, 
  FiClock, 
  FiShoppingCart, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiHome
} from "react-icons/fi";
import CartDrawer from "@/components/user/CartDrawer";
import Footer from "@/components/Footer";
import toast from "react-hot-toast";

export default function UserProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, userRole, loading, userName, userEmail } = useAppSelector((s) => s.auth);
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Layout states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/user/login");
    } else if (userRole === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [isLoggedIn, userRole, loading, router]);

  const handleLogout = async () => {
    localStorage.removeItem("mock_user");
    await signOut(auth);
    toast.success("Logged out successfully.");
    router.push("/user/login");
  };

  const navLinks = [
    { label: "Pantry Perks", path: "/user/menu", icon: FiCoffee },
    { label: "Leave Directory", path: "/user/leaves", icon: FiCalendar },
    { label: "Order History", path: "/user/orders", icon: FiClock },
  ];

  if (loading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Loading Portal...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white font-dm-sans">
      
      {/* Sidebar Logo */}
      <div className="px-6 py-6 border-b border-gray-150 shrink-0">
        <div 
          className="flex flex-col leading-none cursor-pointer"
          onClick={() => { router.push("/user/home"); setMobileMenuOpen(false); }}
        >
          <span className="text-lg font-black text-gray-900 tracking-tighter uppercase">IRO</span>
          <span className="text-[9px] font-black text-[#1d4ed8] tracking-[0.3em] ml-0.5 mt-0.5 uppercase">PEOPLE</span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">

        {/* Separate Category: Home */}
        <button
          onClick={() => {
            router.push("/user/home");
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            pathname === "/user/home"
              ? "bg-gray-100/85 text-gray-900"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
          }`}
        >
          <FiHome size={15} className={pathname === "/user/home" ? "text-[#1d4ed8]" : "text-gray-400"} />
          Home
        </button>
        
        {/* Parent Category: Pantry Perks */}
        <div className="space-y-1">
          <button
            onClick={() => setPantryOpen(!pantryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FiCoffee size={15} className="text-[#1d4ed8]" />
              <span className="text-gray-900">Pantry Perks</span>
            </div>
            {pantryOpen ? <FiChevronUp size={12} className="text-gray-400" /> : <FiChevronDown size={12} className="text-gray-400" />}
          </button>

          {pantryOpen && (
            <div className="pl-3.5 space-y-1.5 animate-fadeIn border-l border-gray-150 ml-5.5">
              {/* Sub-item: Browse Menu */}
              <button
                onClick={() => {
                  router.push("/user/menu");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  pathname === "/user/menu"
                    ? "text-gray-950 font-extrabold"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/30"
                }`}
              >
                <div className={`w-1 h-1 rounded-full ${pathname === "/user/menu" ? "bg-[#1d4ed8] scale-125" : "bg-gray-300"}`} />
                Browse Menu
              </button>

              {/* Sub-item: Pantry Basket */}
              <button
                onClick={() => {
                  setCartOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>Pantry Basket</span>
                </div>
              </button>

              {/* Sub-item: Order History */}
              <button
                onClick={() => {
                  router.push("/user/orders");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  pathname === "/user/orders"
                    ? "text-gray-950 font-extrabold"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/30"
                }`}
              >
                <div className={`w-1 h-1 rounded-full ${pathname === "/user/orders" ? "bg-[#1d4ed8] scale-125" : "bg-gray-300"}`} />
                Order History
              </button>
            </div>
          )}
        </div>

        {/* Separate Category: Leave Directory */}
        <button
          onClick={() => {
            router.push("/user/leaves");
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            pathname === "/user/leaves"
              ? "bg-gray-100/85 text-gray-900"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
          }`}
        >
          <FiCalendar size={15} className={pathname === "/user/leaves" ? "text-[#1d4ed8]" : "text-gray-400"} />
          Leave Directory
        </button>

        {/* Separate Category: Timesheet Logs */}
        <button
          onClick={() => {
            router.push("/user/timesheet");
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            pathname === "/user/timesheet"
              ? "bg-gray-100/85 text-gray-900"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
          }`}
        >
          <FiClock size={15} className={pathname === "/user/timesheet" ? "text-[#1d4ed8]" : "text-gray-400"} />
          Timesheet Logs
        </button>
      </nav>

      {/* Bottom Profile Details & Logout */}
      <div className="p-4 border-t border-gray-150 shrink-0 bg-gray-50/30">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-black text-[#1d4ed8]">
            {userName ? userName.slice(0, 2).toUpperCase() : "EP"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-950 truncate leading-none">{userName || "Employee"}</p>
            <p className="text-[10px] text-gray-400 font-medium truncate mt-1">{userEmail || "staff@company.com"}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-xs font-bold text-gray-500 transition-all uppercase tracking-wider active:scale-[0.98]"
        >
          <FiLogOut size={13} />
          Sign Out
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Left Sidebar - Desktop only */}
      <aside className="hidden md:flex flex-col w-60 border-r border-gray-200 fixed h-full z-20 shrink-0 bg-white">
        {SidebarContent()}
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        
        {/* Mobile Top Header (hidden on desktop) */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0 font-dm-sans">
          <div 
            className="flex flex-col leading-none cursor-pointer"
            onClick={() => router.push("/user/home")}
          >
            <span className="text-base font-black text-gray-900 uppercase">IRO</span>
            <span className="text-[8px] font-black text-[#1d4ed8] tracking-[0.3em] ml-px uppercase">PEOPLE</span>
          </div>

          <div className="flex items-center gap-3">
            {totalQty > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-1.5 text-gray-500 hover:text-[#1d4ed8]"
              >
                <FiShoppingCart size={18} />
                <span className="absolute -top-1 -right-1 bg-[#1d4ed8] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {totalQty}
                </span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <FiMenu size={20} />
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Slider Drawer overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Slide-out Panel */}
            <div className="relative w-64 bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-5 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX size={18} />
              </button>
              {SidebarContent()}
            </div>
          </div>
        )}

        {/* Content Children Wrapper */}
        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 min-w-0">
          {children}
        </main>

        <Footer />

      </div>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
