"use client";

import { useEffect, useRef } from 'react';
import { db, messaging } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { FiBell } from 'react-icons/fi';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Global lock to prevent multiple listeners in the same session
let isListenerActive = false;

export default function PushNotificationManager() {
  const lastProcessedTime = useRef<number>(0);

  useEffect(() => {
    // Sync with localStorage on mount to remember across refreshes
    const savedTime = localStorage.getItem('lastSeenNotificationTime');
    if (savedTime) {
      lastProcessedTime.current = parseInt(savedTime, 10);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging) {
      handleTokenRequest();
    }
  }, []);

  // Listen for global broadcast notifications
  useEffect(() => {
    if (typeof window === 'undefined' || isListenerActive) return;

    isListenerActive = true;
    console.log("🔔 Notification Listener Activated");

    const unsubscribe = onSnapshot(doc(db, "globalNotifications", "current"), (snapshot) => {
      // Ignore local optimistic writes to prevent double notifications for the sender
      if (snapshot.metadata.hasPendingWrites) return;

      const data = snapshot.data();
      if (data && data.timestamp) {
        const sentTime = data.timestamp.toMillis ? data.timestamp.toMillis() : new Date(data.timestamp).getTime();
        const now = Date.now();
        
        const lastSeen = parseInt(localStorage.getItem('lastSeenNotificationTime') || "0", 10);
        
        // Increased window to 5 minutes and removed strict equality check to be more robust
        // We primarily rely on sentTime > lastSeen to prevent duplicates
        if (Math.abs(now - sentTime) < 300000 && sentTime > lastSeen) {
          lastProcessedTime.current = sentTime;
          localStorage.setItem('lastSeenNotificationTime', sentTime.toString());

          // 1. Show In-App Toast (Always works if user is on the site)
          toast(
            (t) => (
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <FiBell size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-[10px] uppercase tracking-widest text-blue-600 mb-0.5">Broadcast Alert</p>
                  <p className="font-bold text-sm text-gray-900 leading-tight mb-1">{data.title || "Iro Snacks"}</p>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{data.body}</p>
                </div>
              </div>
            ),
            {
              duration: 10000, // Show for 10 seconds
              style: {
                maxWidth: '400px',
                padding: '20px',
                borderRadius: '24px',
              }
            }
          );
          
          // 2. Show System Notification (If permission granted)
          if (Notification.permission === 'granted') {
            try {
              new Notification(data.title || "Iro Snacks", {
                body: data.body,
                icon: '/favicon.ico',
              });
            } catch (err) {
              console.error("Browser notification failed:", err);
            }
          }
        }
      }
    });

    return () => {
      unsubscribe();
      isListenerActive = false;
    };
  }, []);

  async function handleTokenRequest() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }

      // Register the service worker for Firebase
      const registration = await navigator.serviceWorker.register('/sw.js');

      const currentToken = await getToken(messaging!, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log('✅ YOUR FCM REGISTRATION TOKEN:');
        console.log(currentToken);
        await saveTokenToFirestore(currentToken);
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token:', err);
    }
  }

  async function saveTokenToFirestore(token: string) {
    try {
      // Use the first 20 chars of token as ID
      const tokenId = btoa(token).slice(0, 50).replace(/\//g, '_');
      await setDoc(doc(db, 'pushSubscriptions', tokenId), {
        fcmToken: token,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save token to Firestore:', err);
    }
  }

  return null;
}

