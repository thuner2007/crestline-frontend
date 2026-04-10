"use client";

import { Elements } from "@stripe/react-stripe-js";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo } from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { STRIPE_PUBLISHABLE_KEY } = useEnv();

  // Memoize stripe promise to prevent re-initialization
  const stripePromise = useMemo(() => {
    if (!STRIPE_PUBLISHABLE_KEY) return null;

    return loadStripe(STRIPE_PUBLISHABLE_KEY);
  }, [STRIPE_PUBLISHABLE_KEY]);

  return (
    <SessionProvider>
      <AuthProvider>
        <Elements
          stripe={stripePromise}
          options={{
            // Appearance customization can be set here to avoid layout shift
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#000000",
              },
            },
          }}
        >
          <CartProvider>{children}</CartProvider>
        </Elements>
      </AuthProvider>
    </SessionProvider>
  );
}
