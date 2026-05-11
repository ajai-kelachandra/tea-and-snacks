import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/authSlice";
import itemsReducer from "@/features/itemsSlice";
import cartReducer from "@/features/cartSlice";
import ordersReducer from "@/features/ordersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    items: itemsReducer,
    cart: cartReducer,
    orders: ordersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
