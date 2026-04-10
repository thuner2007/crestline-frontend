"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useEnv } from "@/context/EnvContext";
import { io, Socket } from "socket.io-client";
import { locales } from "@/navigation";
import { useAuth } from "@/context/AuthContext";

// Lazy load FingerprintJS
let FingerprintJS: typeof import("@fingerprintjs/fingerprintjs") | null = null;

async function loadFingerprintJS() {
  if (!FingerprintJS) {
    FingerprintJS = await import("@fingerprintjs/fingerprintjs");
  }
  return FingerprintJS;
}

// Function to detect if the current client is a bot
function isBot(): boolean {
  if (typeof window === "undefined") return false; // Server-side rendering check

  const userAgent = navigator.userAgent.toLowerCase();
  const botPatterns = [
    "bot",
    "crawl",
    "spider",
    "slurp",
    "baidu",
    "bing",
    "google",
    "yahoo",
    "yandex",
    "facebook",
    "twitter",
    "linkedin",
    "headlesschrome",
    "lighthouse",
    "pagespeed",
    "lighthouse",
    "bingpreview",
    "phantom",
    "puppeteer",
    "selenium",
    "webdriver",
    "cypress",
  ];

  return botPatterns.some((pattern) => userAgent.includes(pattern));
}

// Check for natural user behavior
function behavioralBotCheck(): boolean {
  // Track mouse movements
  let mouseMovements = 0;
  window.addEventListener("mousemove", () => mouseMovements++);

  // After some time, check if there were natural movements
  setTimeout(() => {
    if (mouseMovements < 5) return true; // Likely a bot
    return false;
  }, 3000);

  return false;
}

// Use FingerprintJS for more accurate bot detection
async function fingerprintJSBotCheck(): Promise<boolean> {
  try {
    // Lazy load and initialize FingerprintJS
    const FingerprintJSModule = await loadFingerprintJS();
    const fp = await FingerprintJSModule.load();

    // Get the visitor identifier
    const result = await fp.get();

    // FingerprintJS provides confidence score and bot detection
    const { confidence } = result;

    // Basic bot detection based on confidence and components
    const components = result.components;

    // Check for headless browser indicators with proper type checking
    const platform = components.platform;
    const languages = components.languages;
    const screenResolution = components.screenResolution;

    const isHeadless =
      (platform && "value" in platform && platform.value === "unknown") ||
      (languages &&
        "value" in languages &&
        (!languages.value || languages.value.length === 0)) ||
      (screenResolution &&
        "value" in screenResolution &&
        screenResolution.value &&
        screenResolution.value[0] === 0);

    // Low confidence might indicate bot behavior
    const lowConfidence = confidence && confidence.score < 0.4;

    return Boolean(isHeadless || lowConfidence);
  } catch (error) {
    console.error("FingerprintJS error:", error);
    // If FingerprintJS fails, assume it's not a bot
    return false;
  }
}

async function botDetection(): Promise<boolean> {
  // Combine all checks
  const isBotDetected =
    isBot() || behavioralBotCheck() || (await fingerprintJSBotCheck());
  return isBotDetected;
}

export default function WebSocketTracker() {
  const { BACKEND_URL } = useEnv();
  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);
  const clientIP = "unknown"; // Always use 'unknown' instead of fetching real IP
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const initialPathTrackedRef = useRef(false);
  const previousPathRef = useRef<string | null>(null);
  const hasConnectedRef = useRef(false); // Track if we've already connected
  const [isClientBot, setIsClientBot] = useState<boolean>(false);

  // Check if client is a bot on component mount
  useEffect(() => {
    const checkBotStatus = async () => {
      const isBotDetected = await botDetection();
      setIsClientBot(isBotDetected);
    };

    checkBotStatus();
  }, []);

  // Function to strip language prefix from path
  function stripLangFromPath(path: string): string {
    // Check if path starts with a language prefix
    const pathSegments = path.split("/").filter(Boolean);
    if (
      pathSegments.length > 0 &&
      locales.includes(pathSegments[0] as (typeof locales)[number])
    ) {
      // Remove the language segment and reconstruct the path
      return "/" + pathSegments.slice(1).join("/");
    }
    return path;
  }

  // Get the path without language prefix
  const normalizedPath = stripLangFromPath(pathname);

  // Socket connection - only run once when the component mounts
  useEffect(() => {
    // If user is admin or client is a bot, don't connect to tracker
    if (isAdmin || isClientBot) {
      return;
    }

    // Don't re-connect if we already have an active connection
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    if (!BACKEND_URL) {
      console.error("BACKEND_URL is not defined");
      return;
    }

    // Connect to the socket.io server with the proper namespace
    const socket = io(`${BACKEND_URL}/tracker`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // Connection event
    socket.on("connect", () => {
      hasConnectedRef.current = true;

      // Set the initial path
      previousPathRef.current = normalizedPath;

      // Mark that we've tracked the initial path
      initialPathTrackedRef.current = true;

      // Send initial path info only once when connected
      socket.emit("updateClientInfo", {
        path: normalizedPath,
        ip: clientIP,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handling
    socket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
    });

    socket.on("disconnect", () => {
      // Reset connection flag if disconnected
      hasConnectedRef.current = false;
    });

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [BACKEND_URL, isAdmin, isClientBot, normalizedPath]);

  // When pathname changes, only send an update if the path is different from the previous one
  useEffect(() => {
    // Skip if user is admin or bot
    if (isAdmin || isClientBot) return;

    // Only emit updatePath if:
    // 1. Socket is connected
    // 2. We've already tracked the initial path
    // 3. The current path is different from the previous path
    if (
      socketRef.current?.connected &&
      initialPathTrackedRef.current &&
      previousPathRef.current !== normalizedPath
    ) {
      // Update the previous path reference
      previousPathRef.current = normalizedPath;

      // Send path update
      socketRef.current.emit("updatePath", {
        path: normalizedPath,
        ip: clientIP,
        timestamp: new Date().toISOString(),
      });
    }
  }, [normalizedPath, isAdmin, isClientBot]);

  // This component doesn't render anything
  return null;
}
