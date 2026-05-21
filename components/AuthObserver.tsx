"use client";

import { useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUser, clearUser, setLoading } from "@/features/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import type { UserRole } from "@/features/authSlice";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@company.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export default function AuthObserver({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        dispatch(setLoading(true));
        const { db } = await import("@/lib/firebase");
        const { doc: firestoreDoc, getDoc: getFirestoreDoc, setDoc: setFirestoreDoc } = await import("firebase/firestore");

        let finalName = user.displayName || user.email?.split("@")[0] || "User";

        // Default role from env-based admin email list
        const defaultRole: UserRole = ADMIN_EMAILS.includes((user.email || "").toLowerCase()) ? "super_admin" : "employee";
        let finalRole: UserRole = defaultRole;

        try {
          const userDocRef = firestoreDoc(db, "users", user.uid);
          const userSnap = await getFirestoreDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            finalName = data.name || finalName;
            // ★ RBAC: honour the role stored in Firestore
            const dbRole = data.role;
            if (["super_admin", "payroll_admin", "manager", "hr", "employee", "admin", "user"].includes(dbRole)) {
              if (dbRole === "admin") finalRole = "super_admin";
              else if (dbRole === "user") finalRole = "employee";
              else finalRole = dbRole as UserRole;
            }
          } else {
            // First login — create user doc with default role
            await setFirestoreDoc(userDocRef, {
              email: user.email,
              name: finalName,
              role: defaultRole,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }

        dispatch(
          setUser({
            uid: user.uid,
            email: user.email || "",
            displayName: finalName,
            role: finalRole,
          })
        );
      } else {
        dispatch(clearUser());
      }
    });
    return () => unsub();
  }, [dispatch]);

  return <>{children}</>;
}
