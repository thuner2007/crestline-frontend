"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Create a loading component for better UX
const CheckoutLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="loading-skeleton w-full max-w-4xl h-96 rounded-lg"></div>
  </div>
);

// Dynamically import the checkout page to reduce initial bundle size
const DynamicCheckoutPage = dynamic(
  () => import("../app/[locale]/checkout/PageClient"),
  {
    loading: CheckoutLoading,
    ssr: false, // Checkout is interactive, no need for SSR
  }
) as ComponentType;

export default DynamicCheckoutPage;
