import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type OrderStatus = "placed" | "prepared" | "cancelled";

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  type: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk("orders/fetchOrders", async () => {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Order[];
  } catch (err) {
    console.error("Firebase fetch orders failed", err);
    throw err;
  }
});

export const placeOrder = createAsyncThunk(
  "orders/placeOrder",
  async (order: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">) => {
    let finalOrderNumber = 1001;

    try {
      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "metadata", "orderCounter");
        const counterSnap = await transaction.get(counterRef);
        
        if (!counterSnap.exists()) {
          transaction.set(counterRef, { count: 1001 });
          finalOrderNumber = 1001;
        } else {
          const newCount = (counterSnap.data().count || 1000) + 1;
          transaction.update(counterRef, { count: newCount });
          finalOrderNumber = newCount;
        }
      });
    } catch (e) {
      console.error("Counter transaction failed", e);
      finalOrderNumber = Math.floor(Math.random() * 9000) + 1000;
    }

    const docRef = await addDoc(collection(db, "orders"), {
      ...order,
      orderNumber: finalOrderNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const now = new Date().toISOString();
    return { 
      id: docRef.id, 
      orderNumber: finalOrderNumber, 
      ...order, 
      createdAt: now, 
      updatedAt: now 
    } as Order;
  }
);

export const updateOrderStatus = createAsyncThunk(
  "orders/updateStatus",
  async ({ id, status }: { id: string; status: OrderStatus }) => {
    const docRef = doc(db, "orders", id);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    return { id, status };
  }
);

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrders: (state, action) => {
      state.orders = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch orders";
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.orders.unshift(action.payload);
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const order = state.orders.find((o) => o.id === id);
        if (order) order.status = status;
      });
  },
});

export const { setOrders } = ordersSlice.actions;

export default ordersSlice.reducer;
