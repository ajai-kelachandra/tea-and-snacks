"use client";

import { TeaSnackItem } from "@/features/itemsSlice";
import { addToCart, updateQuantity, removeFromCart } from "@/features/cartSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Badge from "@/components/ui/Badge";
import { FiPlus, FiMinus, FiCoffee, FiSun } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface MenuCardProps {
  item: TeaSnackItem;
  isOrderingEnabled?: boolean;
}

export default function MenuCard({ item, isOrderingEnabled = true }: MenuCardProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const inCart = cartItems.find((i) => i.id === item.id);

  const handleAdd = () => {
    if (!isOrderingEnabled) {
      toast.error("Ordering is closed.");
      return;
    }
    dispatch(addToCart({ id: item.id, name: item.name, type: item.type, imageUrl: item.imageUrl, price: item.price }));
    if (!inCart) toast.success(`${item.name} added!`, { duration: 1000 });
  };

  const handleDecrease = () => {
    if (!inCart) return;
    if (inCart.quantity === 1) {
      dispatch(removeFromCart(item.id));
    } else {
      dispatch(updateQuantity({ id: item.id, quantity: inCart.quantity - 1 }));
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col font-dm-sans transition-all duration-200">
      
      {/* Flat Clean Image Container */}
      <div className="relative h-40 bg-gray-50 overflow-hidden shrink-0">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x200/f9fafb/9ca3af?text=Office+Pantry";
          }}
        />

        {/* Small Elegant Session Identifier (Top Right) */}
        {item.timeSlot && item.timeSlot !== "all-day" && (
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/95 text-gray-700 shadow-sm border border-gray-150`}>
              {item.timeSlot === 'morning' ? <FiSun size={8} /> : <FiCoffee size={8} />}
              {item.timeSlot} slot
            </span>
          </div>
        )}
      </div>

      {/* Info Details Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-xs leading-snug tracking-tight truncate flex-1">
              {item.name}
            </h3>
            <span className="shrink-0">
              <Badge type={item.type} />
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed">
            {item.description || "Company sponsored refreshment perk."}
          </p>
        </div>

        {/* Action Controls & Allowance Indicator */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wide">
            <span>Corporate Benefit</span>
            <span className="text-[#1d4ed8]">Fully Sponsored</span>
          </div>

          <AnimatePresence mode="wait">
            {inCart ? (
              <motion.div
                key="stepper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-1"
              >
                <button
                  onClick={handleDecrease}
                  id={`decrease-${item.id}`}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors active:scale-95"
                >
                  <FiMinus size={10} className="stroke-[3]" />
                </button>

                <span className="text-xs font-bold text-gray-900 tabular-nums">
                  {inCart.quantity}
                </span>

                <button
                  onClick={handleAdd}
                  id={`increase-${item.id}`}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-colors active:scale-95"
                >
                  <FiPlus size={10} className="stroke-[3]" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                onClick={handleAdd}
                id={`add-to-cart-${item.id}`}
                disabled={!isOrderingEnabled}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all duration-150 active:scale-[0.98]
                  ${!isOrderingEnabled
                    ? "bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed"
                    : "bg-[#1d4ed8] text-white hover:bg-[#1e40af]"
                  }`}
              >
                <FiPlus size={10} className="stroke-[3]" />
                Add to Cart
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
