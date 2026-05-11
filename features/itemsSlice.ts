import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";


export type ItemType = "tea" | "coffee" | "snack";
export type TimeSlot = "morning" | "evening" | "all-day" | "";

export interface TeaSnackItem {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  price?: number;
  imageUrl: string;
  isActive: boolean;
  timeSlot: TimeSlot;
  createdAt?: string;
}

interface ItemsState {
  items: TeaSnackItem[];
  loading: boolean;
  error: string | null;
}

const initialState: ItemsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchItems = createAsyncThunk("items/fetchItems", async () => {
  try {
    const q = query(collection(db, "teaSnackItems"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || "",
    })) as TeaSnackItem[];
  } catch (err) {
    console.error("Firebase fetch failed", err);
    throw err;
  }
});

export const addItem = createAsyncThunk(
  "items/addItem",
  async (item: Omit<TeaSnackItem, "id" | "createdAt">) => {
    const docRef = await addDoc(collection(db, "teaSnackItems"), {
      ...item,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...item, createdAt: new Date().toISOString() } as TeaSnackItem;
  }
);

export const updateItem = createAsyncThunk(
  "items/updateItem",
  async ({ id, data }: { id: string; data: Partial<TeaSnackItem> }) => {
    const docRef = doc(db, "teaSnackItems", id);
    await updateDoc(docRef, data);
    return { id, data };
  }
);

export const deleteItem = createAsyncThunk(
  "items/deleteItem",
  async (id: string) => {
    const docRef = doc(db, "teaSnackItems", id);
    await deleteDoc(docRef);
    return id;
  }
);

const itemsSlice = createSlice({
  name: "items",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch items";
      })
      .addCase(addItem.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        const { id, data } = action.payload;
        const idx = state.items.findIndex((i) => i.id === id);
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...data };
        }
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});

export default itemsSlice.reducer;
