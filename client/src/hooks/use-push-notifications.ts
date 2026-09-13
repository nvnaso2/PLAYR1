import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

const isNative = typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isNative) {
      // Native tokens are intentionally not registered until the server has
      // an APNs/FCM delivery provider. Avoid showing users a working state
      // that cannot receive the notifications this preference controls.
      setIsSupported(false);
      setIsLoading(false);
    } else {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      setIsSupported(supported);
      if (supported) {
        checkWebSubscription();
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  async function checkNativeSubscription() {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const result = await PushNotifications.checkPermissions();
      setIsSupported(true);
      setIsSubscribed(result.receive === "granted");
    } catch {
      setIsSupported(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function checkWebSubscription() {
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
      if (isNative) {
        return await subscribeNative();
      } else {
        return await subscribeWeb();
      }
    } catch (e) {
      console.error("Error subscribing to push:", e);
      setIsLoading(false);
      return false;
    }
  }, []);

  async function subscribeNative() {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") {
      setIsLoading(false);
      return false;
    }
    await PushNotifications.register();
    await new Promise<void>((resolve, reject) => {
      PushNotifications.addListener("registration", async (token) => {
        try {
          const platform = (window as any).Capacitor?.getPlatform?.() || "ios";
          await apiRequest("POST", "/api/push/native-token", {
            token: token.value,
            platform,
          });
          setIsSubscribed(true);
        } catch (e) {
          console.error("Failed to register native push token:", e);
        }
        resolve();
      });
      PushNotifications.addListener("registrationError", () => reject());
      setTimeout(reject, 10000);
    }).catch(() => {});
    setIsLoading(false);
    return true;
  }

  async function subscribeWeb() {
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
      keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
    });
    setIsSubscribed(true);
    setIsLoading(false);
    return true;
  }

  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isNative) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        await PushNotifications.removeAllListeners();
        setIsSubscribed(false);
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await apiRequest("DELETE", "/api/push/unsubscribe", { endpoint: sub.endpoint });
            await sub.unsubscribe();
          }
        }
        setIsSubscribed(false);
      }
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
