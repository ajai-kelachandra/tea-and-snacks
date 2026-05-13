"use client";

import { TeaSnackItem } from "@/features/itemsSlice";
import { addToCart, updateQuantity, removeFromCart } from "@/features/cartSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import Badge from "@/components/ui/Badge";
import { FiPlus, FiMinus } from "react-icons/fi";
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
      toast.error("Ordering is currently disabled.");
      return;
    }
    dispatch(addToCart({ id: item.id, name: item.name, type: item.type, imageUrl: item.imageUrl, price: item.price }));
    if (!inCart) toast.success(`${item.name} added!`, { duration: 1500 });
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
    <div className="group bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 animate-fadeIn flex flex-col font-dm-sans">
      {/* Image Section */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/400x160/f9fafb/9ca3af?text=Delicious+Snack";
          }}
        />
        
        {/* Session Badge */}
        {item.timeSlot && item.timeSlot !== "all-day" && (
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${
              item.timeSlot === 'morning' 
                ? 'bg-orange-500/10 text-orange-600 border-orange-200/50' 
                : 'bg-indigo-500/10 text-indigo-600 border-indigo-200/50'
            }`}>
              {item.timeSlot}
            </span>
          </div>
        )}

        <div className="absolute top-4 left-4">
          <Badge type={item.type} />
        </div>
      </div>

      {/* Info Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-black text-gray-900 text-base leading-tight tracking-tight">
            {item.name}
          </h3>
        </div>
        
        <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed flex-1">
          {item.description}
        </p>

        {/* Action Button / Stepper */}
        <AnimatePresence mode="wait">
          {inCart ? (
            <motion.div
              key="stepper"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-1"
            >
              <button
                onClick={handleDecrease}
                id={`decrease-${item.id}`}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-90 shadow-sm"
              >
                <FiMinus size={13} className="stroke-[3]" />
              </button>

              <span className="text-sm font-black text-gray-900 tabular-nums min-w-[20px] text-center">
                {inCart.quantity}
              </span>

              <button
                onClick={handleAdd}
                id={`increase-${item.id}`}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1d4ed8] text-white hover:bg-[#1e40af] transition-all active:scale-90 shadow-sm shadow-blue-100"
              >
                <FiPlus size={13} className="stroke-[3]" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="add"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={handleAdd}
              id={`add-to-cart-${item.id}`}
              disabled={!isOrderingEnabled}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95
                ${!isOrderingEnabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#1d4ed8] text-white hover:bg-[#1e40af] shadow-lg shadow-blue-100"
                }`}
            >
              <FiPlus size={14} className="stroke-[3]" />
              Add to Order
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
