"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { removeFromCart, updateQuantity, clearCart } from "@/features/cartSlice";
import { placeOrder } from "@/features/ordersSlice";
import {
  FiX,
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  isOrderingEnabled?: boolean;
}

export default function CartDrawer({ open, onClose, isOrderingEnabled = true }: CartDrawerProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const { uid, userEmail, userName } = useAppSelector((s) => s.auth);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    if (!uid || !userEmail) {
      toast.error("Please login to place an order.");
      return;
    }
    if (!isOrderingEnabled) {
      toast.error("Ordering is currently disabled.");
      return;
    }
    setPlacing(true);
    try {
      await dispatch(
        placeOrder({
          userId: uid,
          userEmail,
          userName: userName || userEmail,
          items: cartItems.map((i) => ({
            itemId: i.id,
            name: i.name,
            quantity: i.quantity,
            type: i.type,
          })),
          status: "placed",
        })
      ).unwrap();

      dispatch(clearCart());
      setPlaced(true);
      toast.success("Order placed successfully!");
      setTimeout(() => {
        setPlaced(false);
        onClose();
      }, 1800);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col animate-slideUp sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiShoppingCart size={18} className="text-[#1d4ed8]" />
            <h2 className="font-bold text-gray-900">My Cart</h2>
            {totalItems > 0 && (
              <span className="bg-[#1d4ed8] text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
            id="close-cart-btn"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {placed ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck size={28} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">Order Placed!</p>
              <p className="text-sm text-gray-500">
                Your order has been submitted successfully.
              </p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-gray-400">
              <FiShoppingCart size={40} className="opacity-30" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-xs">Browse the menu and add items to order.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/48x48/f3f4f6/9ca3af?text=?";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      dispatch(
                        updateQuantity({ id: item.id, quantity: item.quantity - 1 })
                      )
                    }
                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                    id={`cart-dec-${item.id}`}
                  >
                    <FiMinus size={10} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      dispatch(
                        updateQuantity({ id: item.id, quantity: item.quantity + 1 })
                      )
                    }
                    className="w-6 h-6 rounded-full bg-[#1d4ed8] hover:bg-[#1e40af] flex items-center justify-center text-white transition-colors"
                    id={`cart-inc-${item.id}`}
                  >
                    <FiPlus size={10} />
                  </button>
                  <button
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="w-6 h-6 rounded-full hover:bg-red-100 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors ml-1"
                    id={`cart-remove-${item.id}`}
                  >
                    <FiTrash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!placed && cartItems.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            {!isOrderingEnabled && (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center bg-red-50 py-2 rounded-lg border border-red-100">
                Ordering is temporarily disabled
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total items</span>
              <span className="font-bold text-gray-900">{totalItems}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={placing || !isOrderingEnabled}
              id="place-order-btn"
              className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {placing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiCheck size={16} />
              )}
              {placing ? "Placing Order…" : "Place Order"}
            </button>
            <button
              onClick={() => dispatch(clearCart())}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
              id="clear-cart-btn"
            >
              Clear all items
            </button>
          </div>
        )}
      </div>
    </>
  );
}
