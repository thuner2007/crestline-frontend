// Service Worker for caching static resources and push notifications
const CACHE_NAME = "revsticks-v3";
const STATIC_ASSETS = ["/manifest.json", "/favicon.ico"];

// Install event - cache static assets (skip missing files)
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Add files one by one, ignoring failures
      await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          })
        )
      );
      console.log("Service Worker: Installed successfully");
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("Service Worker: Activated successfully");
        return self.clients.claim();
      })
  );
});

// Fetch event - optimized caching strategy
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API requests - let them go directly to network
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background (stale-while-revalidate)
        event.waitUntil(
          fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses for static assets
          if (
            response.status === 200 &&
            (event.request.url.includes(".js") ||
              event.request.url.includes(".css") ||
              event.request.url.includes(".png") ||
              event.request.url.includes(".jpg") ||
              event.request.url.includes(".webp") ||
              event.request.url.includes(".svg") ||
              event.request.url.includes(".woff") ||
              event.request.url.includes(".woff2"))
          ) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
          }

          return response;
        })
        .catch(() => {
          // Return offline page for HTML requests if available
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/offline.html");
          }
        });
    })
  );
});

// Push notification event handler
self.addEventListener("push", function (event) {
  console.log("Service Worker: Push event received", event);
  if (event.data) {
    try {
      const data = event.data.json();
      console.log("Service Worker: Push notification data:", data);

      const options = {
        body: data.body,
        icon: data.icon || "/revsticks_logo_quadratisch_192.png",
        badge: data.badge || "/revsticks_logo_quadratisch_192.png",
        data: data.data,
        vibrate: [200, 100, 200],
        tag: data.data?.orderId || "revsticks-notification",
        requireInteraction: true,
        actions: data.data?.orderId
          ? [
              {
                action: "view",
                title: "View Order",
              },
              {
                action: "close",
                title: "Close",
              },
            ]
          : undefined,
      };

      event.waitUntil(
        self.registration
          .showNotification(data.title, options)
          .then(() => console.log("Service Worker: Notification shown"))
          .catch((err) =>
            console.error("Service Worker: Failed to show notification", err)
          )
      );
    } catch (error) {
      console.error("Service Worker: Error parsing push data", error);
    }
  }
});

// Notification click event handler
self.addEventListener("notificationclick", function (event) {
  console.log("Service Worker: Notification clicked", event);
  event.notification.close();

  if (event.action === "close") {
    console.log("Service Worker: Close action clicked");
    return;
  }

  // Open the order details page or dashboard
  const orderId = event.notification.data?.orderId;
  const url = orderId
    ? `${self.location.origin}/admin?section=orders&orderId=${orderId}`
    : `${self.location.origin}/admin?section=orders`;

  console.log("Service Worker: Opening URL:", url);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        console.log("Service Worker: Found clients:", clientList.length);
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes("/admin") && "focus" in client) {
            return client.focus().then(() => {
              // Send a message to the client to navigate to the order
              if (orderId) {
                client.postMessage({
                  type: "NAVIGATE_TO_ORDER",
                  orderId: orderId,
                });
              }
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
