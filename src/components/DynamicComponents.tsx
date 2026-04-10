"use client";

import dynamic from "next/dynamic";

// Dynamic imports for heavy components to reduce initial bundle size

// Editor Canvas - Heavy with many dependencies
export const DynamicEditorCanvas = dynamic(() => import("./EditorCanvas"), {
  loading: () => (
    <div className="loading-skeleton w-full h-96 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

// Image Carousel - Heavy with framer-motion
export const DynamicImageCarousel = dynamic(() => import("./ImageCarousel"), {
  loading: () => (
    <div className="loading-skeleton w-full h-64 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

// Admin components - Only needed for admin users
export const DynamicAddPart = dynamic(() => import("./AdminPage/AddPart"), {
  loading: () => (
    <div className="loading-skeleton w-full h-96 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

export const DynamicOrders = dynamic(() => import("./AdminPage/Orders"), {
  loading: () => (
    <div className="loading-skeleton w-full h-96 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

// Payment components - Heavy with Stripe/PayPal
export const DynamicPaymentElement = dynamic(
  () =>
    import("@stripe/react-stripe-js").then((mod) => ({
      default: mod.PaymentElement,
    })),
  {
    loading: () => (
      <div className="loading-skeleton w-full h-32 rounded-lg animate-pulse"></div>
    ),
    ssr: false,
  }
);

export const DynamicPayPalButtons = dynamic(
  () =>
    import("@paypal/react-paypal-js").then((mod) => ({
      default: mod.PayPalButtons,
    })),
  {
    loading: () => (
      <div className="loading-skeleton w-full h-16 rounded-lg animate-pulse"></div>
    ),
    ssr: false,
  }
);

// Additional heavy components
export const DynamicPropertyWindow = dynamic(() => import("./PropertyWindow"), {
  loading: () => (
    <div className="loading-skeleton w-full h-64 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

export const DynamicElementsList = dynamic(() => import("./ElementsList"), {
  loading: () => (
    <div className="loading-skeleton w-full h-48 rounded-lg animate-pulse"></div>
  ),
  ssr: false,
});

export const DynamicShape = dynamic(() => import("./Shape"), {
  ssr: false,
});

export const DynamicWhatsAppPopup = dynamic(() => import("./WhatsAppPopup"), {
  ssr: false,
  loading: () => null,
});

export const DynamicResizableElement = dynamic(
  () => import("./ResizableElement"),
  {
    ssr: false,
  }
);

export const DynamicAddElementsPanel = dynamic(
  () => import("./AddElementsPanel"),
  {
    loading: () => (
      <div className="loading-skeleton w-full h-48 rounded-lg animate-pulse"></div>
    ),
    ssr: false,
  }
);
