"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setOrders, Order } from "@/features/ordersSlice";
import { FiClipboard } from "react-icons/fi";
import { format } from "date-fns";
import { calculateOrderCharges } from "@/lib/orderUtils";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function UserOrdersPage() {
  const dispatch = useAppDispatch();
  const { orders, loading } = useAppSelector((s) => s.orders);
  const { uid } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Order[];
      dispatch(setOrders(ordersData));
    });

    return () => unsub();
  }, [dispatch]);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Filter orders to only show the last 24 hours and not cleared by admin
  const myOrders = [...orders]
    .filter((o) => o.userId === uid && new Date(o.createdAt) > oneDayAgo && !o.isCleared)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getSession = (dateStr: string) => {
    const hour = new Date(dateStr).getHours();
    return hour < 13 ? "Morning Session" : "Evening Session";
  };

  // Pre-calculate charges chronologically for all orders
  const orderCharges = calculateOrderCharges(orders);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 font-dm-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-black tracking-tight">Order History</h1>
        <p className="text-gray-400 text-sm">Showing your activity from the last 24 hours.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse h-32" />
          ))}
        </div>
      ) : myOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
          <FiClipboard size={32} className="mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-bold text-black mb-1">No orders yet</h3>
          <p className="text-gray-400 text-sm mb-6">Your order history will appear here once you place your first request.</p>
          <button 
            onClick={() => window.location.href = "/user/menu"}
            className="text-[#1d4ed8] text-sm font-bold hover:underline"
          >
            Go to Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {[...myOrders].reverse().map((order) => {
            const session = getSession(order.createdAt);
            const charges = orderCharges[order.id] || { items: order.items.map((i: any) => ({ ...i, billableQty: 0 })), extraCharge: 0 };
            const processedItems = charges.items;

            return (
              <div key={order.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-blue-100 transition-all">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-900">
                      {format(new Date(order.createdAt), "dd MMM yyyy")}
                    </span>
                    <span className="text-gray-200">•</span>
                    <span className="text-xs font-bold text-[#1d4ed8] uppercase tracking-wider">
                      {session}
                    </span>
                    <span className="text-gray-200">•</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase">
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} {order.items.reduce((acc, item) => acc + item.quantity, 0) === 1 ? "Item" : "Items"}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    order.status === "placed" ? "border-blue-100 text-blue-600 bg-blue-50" :
                    order.status === "prepared" ? "border-green-100 text-green-600 bg-green-50" :
                    "border-red-100 text-red-600 bg-red-50"
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {processedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-black text-black">
                          {item.quantity}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{item.name}</p>
                          {item.billableQty > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                              <span className="text-[10px] font-bold tracking-wider">
                                Extra item: ₹12 × {item.billableQty} = ₹{item.billableQty * 12} (Exceeded daily limit)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.type}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    {charges.extraCharge > 0 && (
                      <span className="text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 shadow-sm">
                        Extra Charge: ₹{charges.extraCharge}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Ordered at </span>
                    <span className="text-xs font-bold text-gray-600">{format(new Date(order.createdAt), "hh:mm a")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

