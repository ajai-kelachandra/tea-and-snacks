"use client";

import { useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setUser, clearUser } from "@/features/authSlice";
import { useAppDispatch } from "@/lib/hooks";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@company.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export default function AuthObserver({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { db } = await import("@/lib/firebase");
        const { doc: firestoreDoc, getDoc: getFirestoreDoc, setDoc: setFirestoreDoc } = await import("firebase/firestore");
        
        let finalName = user.displayName || user.email?.split("@")[0] || "User";
        const role = ADMIN_EMAILS.includes((user.email || "").toLowerCase()) ? "admin" : "user";

        try {
          const userDocRef = firestoreDoc(db, "users", user.uid);
          const userSnap = await getFirestoreDoc(userDocRef);
          
          if (userSnap.exists()) {
            finalName = userSnap.data().name || finalName;
          } else {
            // Initialize user doc if it doesn't exist
            await setFirestoreDoc(userDocRef, {
              email: user.email,
              name: finalName,
              role,
              createdAt: new Date().toISOString()
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
            role,
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
