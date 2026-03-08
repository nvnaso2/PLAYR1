import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (e) {
      console.error("Error checking push subscription:", e);
    } finally {
      setIsLoading(false);
    }
  }

  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const res = await fetch("/api/push/vapid-key");
      if (!res.ok) throw new Error("VAPID key not available");
      const { publicKey } = await res.json();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsLoading(false);
        return false;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("Error subscribing to push:", e);
      setIsLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await apiRequest("DELETE", "/api/push/unsubscribe", {
            endpoint: sub.endpoint,
          });
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("Error unsubscribing from push:", e);
      setIsLoading(false);
      return false;
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
