"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { FiCoffee, FiShoppingCart, FiLogOut } from "react-icons/fi";
import CartDrawer from "./CartDrawer";
import toast from "react-hot-toast";

export default function UserHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { userName } = useAppSelector((s) => s.auth);
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const [cartOpen, setCartOpen] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem("mock_user");
    await signOut(auth);
    toast.success("Logged out!");
    router.push("/user/login");
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 font-bricolage">
          {/* Logo Section */}
          <div 
            className="flex flex-col leading-none cursor-pointer group" 
            onClick={() => router.push("/user/menu")}
          >
            <span className="text-xl font-black text-black tracking-tighter uppercase">IRO</span>
            <span className="text-[10px] font-black text-[#1d4ed8] tracking-[0.3em] ml-0.5 uppercase">PEOPLE</span>
          </div>

          {/* Stepper-style Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-[11px] font-medium tracking-[0.15em] text-gray-400">
            <button 
              onClick={() => router.push("/user/menu")}
              className={`flex items-center gap-2.5 uppercase transition-all ${pathname === "/user/menu" ? "text-black" : "hover:text-gray-600"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pathname === "/user/menu" ? "bg-[#1d4ed8]" : "bg-gray-200"}`} />
              Snack
            </button>
            <div className="w-8 h-[1px] bg-gray-300" />
            <button 
              onClick={() => router.push("/user/leaves")}
              className={`flex items-center gap-2.5 uppercase transition-all ${pathname === "/user/leaves" ? "text-black" : "hover:text-gray-600"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pathname === "/user/leaves" ? "bg-[#1d4ed8]" : "bg-gray-200"}`} />
              Leaves
            </button>
            <div className="w-8 h-[1px] bg-gray-300" />
            <button 
              onClick={() => setCartOpen(true)}
              className={`flex items-center gap-2.5 uppercase transition-all ${cartOpen ? "text-black" : "hover:text-gray-600"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${cartOpen ? "bg-[#1d4ed8]" : "bg-gray-200"}`} />
              Cart
            </button>
            <div className="w-8 h-[1px] bg-gray-300" />
            <button 
              onClick={() => router.push("/user/orders")}
              className={`flex items-center gap-2.5 uppercase transition-all ${pathname === "/user/orders" ? "text-black" : "hover:text-gray-600"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pathname === "/user/orders" ? "bg-[#1d4ed8]" : "bg-gray-200"}`} />
              History
            </button>
          </nav>

          {/* Action Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center bg-black text-white px-7 py-2.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
              id="open-cart-btn"
            >
              Basket
              {totalQty > 0 && (
                <span className="ml-2.5 bg-[#1d4ed8] text-[9px] px-2 py-0.5 rounded-full leading-none font-black">
                  {totalQty}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-[#1d4ed8] transition-colors p-1"
              title="Logout"
              id="user-logout-btn"
            >
              <FiLogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
