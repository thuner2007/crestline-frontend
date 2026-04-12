"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Send, CheckCircle, XCircle } from "lucide-react";
import { useEnv } from "@/context/EnvContext";
import storage from "@/lib/storage";

interface PushNotificationsProps {
  csrfToken: string;
}

const PushNotifications: React.FC<PushNotificationsProps> = ({ csrfToken }) => {
  const { BACKEND_URL } = useEnv();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string>("");

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): BufferSource => {
    try {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      console.log(
        "VAPID key converted successfully, length:",
        outputArray.length
      );
      return outputArray;
    } catch (error) {
      console.error("Error converting VAPID key:", error);
      throw new Error("Failed to convert VAPID key");
    }
  };

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Check if already subscribed on component mount
  useEffect(() => {
    checkSubscriptionStatus();
    fetchVapidKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVapidKey = async () => {
    try {
      // Get access token for authenticated request
      const accessToken = storage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Not authenticated. Please log in.");
      }

      // Get CSRF token from storage (where it's actually stored)
      const storedCsrfToken = storage.getItem("csrf_token") || csrfToken;

      const response = await fetch(
        `${BACKEND_URL}/notifications/vapid-public-key`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-CSRF-Token": storedCsrfToken,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch VAPID key: ${response.status}`);
      }

      const data = await response.json();

      if (!data.publicKey) {
        throw new Error("VAPID public key not found in response");
      }

      console.log("VAPID key fetched successfully");
      setVapidPublicKey(data.publicKey);
    } catch (error) {
      console.error("Error fetching VAPID key:", error);
      showStatus(
        `Failed to fetch VAPID key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const resetServiceWorker = async () => {
    try {
      console.log("Resetting service worker...");

      // Get all registrations
      const registrations = await navigator.serviceWorker.getRegistrations();

      // Unregister all service workers
      for (const registration of registrations) {
        console.log("Unregistering service worker:", registration.scope);
        await registration.unregister();
      }

      console.log("All service workers unregistered");

      // Clear caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        console.log("Deleting cache:", cacheName);
        await caches.delete(cacheName);
      }

      console.log("All caches cleared");
      showStatus(
        "✅ Service worker reset successfully. Please try subscribing again.",
        "success"
      );
    } catch (error) {
      console.error("Error resetting service worker:", error);
      showStatus(
        `❌ Error resetting: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      // Check if service worker is supported
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers are not supported");
      }

      // Check if push notifications are supported
      if (!("PushManager" in window)) {
        throw new Error("Push notifications are not supported");
      }

      // Check if VAPID key is loaded
      if (!vapidPublicKey) {
        throw new Error(
          "VAPID public key not loaded. Please refresh the page and try again."
        );
      }

      // Check for Chrome localhost limitation
      const isChromeLikeLocalhost =
        typeof window !== "undefined" &&
        window.location.protocol === "http:" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") &&
        /Chrome|Chromium|Edg/.test(navigator.userAgent) &&
        !/Firefox/.test(navigator.userAgent);

      if (isChromeLikeLocalhost) {
        throw new Error(
          "Chrome blocks push notifications on HTTP localhost. Please use Firefox, enable HTTPS, or deploy to production. See the warning above for details."
        );
      }

      console.log("Requesting notification permission...");
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);

      if (permission !== "granted") {
        throw new Error("Notification permission denied");
      }

      console.log("Checking for existing service worker...");
      // Check if service worker is already registered
      let registration = await navigator.serviceWorker.getRegistration("/");

      if (registration) {
        console.log("Using existing service worker registration");
        // Update the service worker if needed
        await registration.update();
      } else {
        console.log("Registering new service worker...");
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        console.log("Service worker registered successfully");
      }

      // Wait for service worker to be ready
      console.log("Waiting for service worker to be ready...");
      registration = await navigator.serviceWorker.ready;
      console.log("Service worker ready");

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("Found existing subscription, unsubscribing first...");
        await existingSubscription.unsubscribe();
        // Wait a bit for the unsubscription to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log("Subscribing to push notifications...");
      console.log("VAPID key (raw):", vapidPublicKey);
      console.log("VAPID key length:", vapidPublicKey.length);

      // Convert and log the result
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      console.log("Converted VAPID key (Uint8Array):", applicationServerKey);
      console.log("Converted key length:", applicationServerKey.byteLength);

      // Try to get the push manager
      const pushManager = registration.pushManager;
      console.log("Push manager available:", !!pushManager);

      // Check if we can get permission state
      try {
        const permissionState = await pushManager.permissionState({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });
        console.log("Permission state:", permissionState);

        if (permissionState !== "granted") {
          throw new Error(
            `Push permission state is ${permissionState}, not granted`
          );
        }
      } catch (e) {
        console.warn("Could not check permission state:", e);
      }

      // Subscribe to push notifications
      console.log("Calling pushManager.subscribe...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      console.log("Successfully subscribed to push notifications");

      // Get access token
      const accessToken = storage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      console.log(
        "Access token retrieved:",
        accessToken ? `${accessToken.substring(0, 20)}...` : "null"
      );
      console.log(
        "CSRF token:",
        csrfToken ? `${csrfToken.substring(0, 20)}...` : "null"
      );

      // Get CSRF token from storage (where it's actually stored)
      const storedCsrfToken = storage.getItem("csrf_token") || csrfToken;
      console.log(
        "Stored CSRF token:",
        storedCsrfToken ? `${storedCsrfToken.substring(0, 20)}...` : "null"
      );

      // Send subscription to backend
      console.log("Sending subscription to backend...");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-CSRF-Token": storedCsrfToken,
      };

      console.log("Request headers being sent:", {
        "Content-Type": headers["Content-Type"],
        Authorization: `Bearer ${accessToken.substring(0, 20)}...`,
        "X-CSRF-Token": storedCsrfToken
          ? `${storedCsrfToken.substring(0, 20)}...`
          : "null",
      });

      const response = await fetch(`${BACKEND_URL}/notifications/subscribe`, {
        method: "POST",
        headers: headers,
        credentials: "include",
        body: JSON.stringify(subscription),
      });

      console.log("Backend response status:", response.status);
      console.log(
        "Backend response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to subscribe on backend");
      }

      setIsSubscribed(true);
      showStatus("✅ Successfully subscribed to notifications!", "success");

      // Save subscription to localStorage
      localStorage.setItem("pushSubscription", JSON.stringify(subscription));
    } catch (error) {
      console.error("Subscribe error:", error);

      let errorMessage = "Unknown error";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide more specific error messages
        if (error.name === "AbortError") {
          if (errorMessage.includes("push service error")) {
            errorMessage =
              "Push service rejected the subscription. This is likely due to Chrome's localhost limitation. Please use Firefox for local development, or deploy to HTTPS.";
          } else {
            errorMessage = `Registration aborted: ${errorMessage}. Try using Firefox or deploying to HTTPS.`;
          }
        } else if (error.name === "NotAllowedError") {
          errorMessage =
            "Push notifications are not allowed. Please check your browser settings and try again.";
        } else if (error.name === "NotSupportedError") {
          errorMessage =
            "Push notifications are not supported in this browser or configuration.";
        }
      }

      showStatus(`❌ ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Get access token
        const accessToken = storage.getItem("access_token");
        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        // Get CSRF token from storage
        const storedCsrfToken = storage.getItem("csrf_token") || csrfToken;

        await fetch(`${BACKEND_URL}/notifications/unsubscribe`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-CSRF-Token": storedCsrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        localStorage.removeItem("pushSubscription");
      }

      setIsSubscribed(false);
      showStatus("✅ Successfully unsubscribed from notifications", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showStatus(`❌ Error: ${errorMessage}`, "error");
      console.error("Unsubscribe error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const accessToken = storage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      // Get CSRF token from storage
      const storedCsrfToken = storage.getItem("csrf_token") || csrfToken;

      const response = await fetch(`${BACKEND_URL}/notifications/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-CSRF-Token": storedCsrfToken,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to send test notification"
        );
      }

      showStatus("✅ Test notification sent!", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showStatus(`❌ Error: ${errorMessage}`, "error");
      console.error("Test error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Bell className="h-6 w-6" />
        Push Notifications
      </h2>

      {/* Chrome Localhost Warning - Enhanced */}
      {typeof window !== "undefined" &&
        window.location.protocol === "http:" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") && (
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-5 mb-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">🚫</div>
              <div className="flex-1">
                <p className="text-base text-red-900 font-bold mb-3">
                  ⚠️ HTTP Localhost Detected - Push Notifications May Not Work
                </p>
                <p className="text-sm text-red-800 mb-3 font-semibold">
                  Chrome/Edge block push notifications on HTTP localhost due to
                  security policies.
                </p>

                <div className="bg-zinc-900 rounded-md p-4 mb-3 border border-red-200">
                  <p className="text-sm text-zinc-200 font-semibold mb-2">
                    ✅ Recommended Solutions:
                  </p>
                  <ol className="text-sm text-zinc-300 space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">1.</span>
                      <span>
                        <strong className="text-green-700">Use Firefox</strong>{" "}
                        - Works perfectly on HTTP localhost for development
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>
                        <strong className="text-blue-700">
                          Enable HTTPS locally
                        </strong>{" "}
                        - Set up local SSL certificates (see next.config.ts)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">3.</span>
                      <span>
                        <strong className="text-amber-400">
                          Deploy to production
                        </strong>{" "}
                        - Push works perfectly with HTTPS
                      </span>
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-50 rounded-md p-3 border border-yellow-300">
                  <p className="text-xs text-yellow-900 font-semibold mb-1">
                    💡 Quick Test:
                  </p>
                  <p className="text-xs text-yellow-800">
                    Open this admin page in <strong>Firefox</strong> to test
                    push notifications locally without HTTPS setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Subscribe to receive push notifications when
          new orders are placed. On iOS devices, you may need to add this page
          to your home screen for notifications to work properly.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : statusMessage.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : statusMessage.type === "error" ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-zinc-900 rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Notification Status</h3>
            <p className="text-sm text-zinc-400 mt-1">
              {isSubscribed
                ? "You are currently subscribed to push notifications"
                : "You are not subscribed to push notifications"}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isSubscribed
                ? "bg-green-100 text-green-800"
                : "bg-zinc-800 text-zinc-200"
            }`}
          >
            {isSubscribed ? "Active" : "Inactive"}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          {!isSubscribed ? (
            <>
              <button
                onClick={subscribeToPush}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-md hover:bg-amber-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
              >
                <Bell className="h-5 w-5" />
                {isLoading ? "Subscribing..." : "Enable Notifications"}
              </button>

              <button
                onClick={resetServiceWorker}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed text-sm"
              >
                🔄 Reset Service Worker
              </button>
              <p className="text-xs text-zinc-400 text-center">
                Try this if you&apos;re having issues subscribing
              </p>
            </>
          ) : (
            <>
              <button
                onClick={unsubscribeFromPush}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
              >
                <BellOff className="h-5 w-5" />
                {isLoading ? "Unsubscribing..." : "Disable Notifications"}
              </button>

              <button
                onClick={sendTestNotification}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
                {isLoading ? "Sending..." : "Send Test Notification"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 bg-zinc-800 rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-3">iOS Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
          <li>Open this page in Safari on your iPhone or iPad</li>
          <li>Tap the Share button (square with arrow pointing up)</li>
          <li>Select &quot;Add to Home Screen&quot;</li>
          <li>Tap &quot;Add&quot; to create a home screen icon</li>
          <li>Open the app from your home screen</li>
          <li>Tap &quot;Enable Notifications&quot; and allow permissions</li>
          <li>You&apos;ll now receive notifications for new orders!</li>
        </ol>
        <p className="text-sm text-zinc-400 mt-4 italic">
          Note: Push notifications on iOS only work when the page is added to
          the home screen and opened as a standalone web app.
        </p>
      </div>

      <div className="mt-6 bg-yellow-50 rounded-lg p-6 border border-yellow-200">
        <h3 className="text-lg font-semibold mb-3 text-yellow-900">
          Browser Support
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
          <li>Chrome, Edge, Firefox: Full support ✅</li>
          <li>Safari (macOS): Full support ✅</li>
          <li>Safari (iOS): Requires adding to home screen 📱</li>
        </ul>
      </div>

      {/* Debug Information */}
      <div className="mt-6 bg-zinc-800 rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-3">Debug Information</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-400">Service Worker Support:</span>
            <span
              className={`font-semibold ${
                typeof window !== "undefined" && "serviceWorker" in navigator
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {typeof window !== "undefined" && "serviceWorker" in navigator
                ? "Yes"
                : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Push Manager Support:</span>
            <span
              className={`font-semibold ${
                typeof window !== "undefined" && "PushManager" in window
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {typeof window !== "undefined" && "PushManager" in window
                ? "Yes"
                : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Notification Permission:</span>
            <span
              className={`font-semibold ${
                typeof window !== "undefined" &&
                Notification.permission === "granted"
                  ? "text-green-600"
                  : Notification.permission === "denied"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {typeof window !== "undefined"
                ? Notification.permission
                : "unknown"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">VAPID Key Loaded:</span>
            <span
              className={`font-semibold ${
                vapidPublicKey ? "text-green-600" : "text-red-600"
              }`}
            >
              {vapidPublicKey ? "Yes" : "No"}
            </span>
          </div>
          {vapidPublicKey && (
            <div className="mt-2 pt-2 border-t border-zinc-700">
              <span className="text-zinc-400">VAPID Key (first 20 chars):</span>
              <div className="mt-1 p-2 bg-zinc-900 rounded text-xs break-all">
                {vapidPublicKey.substring(0, 20)}...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PushNotifications;
