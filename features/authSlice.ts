import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "user" | null;

interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole;
  userEmail: string | null;
  userName: string | null;
  uid: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  userRole: null,
  userEmail: null,
  userName: null,
  uid: null,
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(
      state,
      action: PayloadAction<{
        uid: string;
        email: string;
        displayName?: string;
        role: UserRole;
      }>
    ) {
      state.isLoggedIn = true;
      state.uid = action.payload.uid;
      state.userEmail = action.payload.email;
      state.userName = action.payload.displayName || action.payload.email;
      state.userRole = action.payload.role;
      state.loading = false;
    },
    clearUser(state) {
      state.isLoggedIn = false;
      state.uid = null;
      state.userEmail = null;
      state.userName = null;
      state.userRole = null;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setUser, clearUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
