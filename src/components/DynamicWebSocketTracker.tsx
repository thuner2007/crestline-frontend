"use client";

import dynamic from "next/dynamic";

// Lazy load WebSocket tracker - not needed for initial render
const WebSocketTracker = dynamic(
  () => import("@/components/WebsocketTracker"),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function DynamicWebSocketTracker() {
  return <WebSocketTracker />;
}
