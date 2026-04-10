"use client";

import dynamic from "next/dynamic";

// Lazy load WhatsApp popup - not needed for initial render
const WhatsAppPopup = dynamic(() => import("@/components/WhatsAppPopup"), {
  ssr: false,
  loading: () => null,
});

export default function DynamicWhatsAppPopup() {
  return <WhatsAppPopup />;
}
