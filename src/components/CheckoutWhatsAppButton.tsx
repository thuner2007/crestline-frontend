"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "+41795014987";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;

interface CheckoutWhatsAppButtonProps {
  paymentError?: string;
}

export default function CheckoutWhatsAppButton({
  paymentError,
}: CheckoutWhatsAppButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleWhatsAppClick = () => {
    window.open(WHATSAPP_URL, "_blank");
  };

  const content = (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col-reverse sm:flex-row items-end gap-3 pointer-events-auto">
      {/* Label: desktop always visible, mobile only on error */}
      <div
        className={`transition-all duration-200 p-3 border shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${
          paymentError
            ? "flex flex-col bg-zinc-900 border-red-500/60 max-w-xs"
            : "hidden sm:flex bg-zinc-900 border-zinc-700 max-w-sm"
        }`}
      >
        <p className={`text-xs font-bold uppercase tracking-widest ${paymentError ? "text-red-400" : "text-zinc-200"}`}>
          Have problems with your payment?
        </p>
        <p className={`text-xs mt-1 ${paymentError ? "text-red-500" : "text-zinc-500"}`}>
          Click the button to chat with us on WhatsApp
        </p>
      </div>

      {/* Mobile condensed pill - always visible on small screens */}
      <div className="sm:hidden mb-2">
        <div className={`border p-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${paymentError ? "bg-zinc-900 border-red-500/60" : "bg-zinc-900 border-zinc-700"}`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${paymentError ? "text-red-400" : "text-zinc-300"}`}>
            Have problems with your payment?
          </p>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleWhatsAppClick}
        className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-200 active:scale-95 flex-shrink-0 ${
          paymentError
            ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
            : "bg-[#25D366] hover:bg-[#1ebe57] text-white"
        }`}
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
