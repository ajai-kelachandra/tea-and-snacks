"use client";

import { useEffect, useRef } from 'react';
import { db, messaging } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

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
        
        if (now - sentTime < 60000 && sentTime > lastSeen && sentTime !== lastProcessedTime.current) {
          if (Notification.permission === 'granted') {
            lastProcessedTime.current = sentTime;
            localStorage.setItem('lastSeenNotificationTime', sentTime.toString());
            
            new Notification(data.title || "Iro Snacks", {
              body: data.body,
              icon: '/favicon.ico',
            });
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

