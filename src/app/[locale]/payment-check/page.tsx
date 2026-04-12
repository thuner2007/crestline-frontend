"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartContext";
import useAxios from "@/useAxios";
import storage from "@/lib/storage";
import { Oswald, DM_Sans } from "next/font/google";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

interface PaymentSuccessResponse {
  success: boolean;
  message?: string;
}

interface DiscountCodeResponse {
  code: string;
}

export default function PaymentCheckPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const t = useTranslations("payment-check");
  const { clearCart } = useCart();

  const accessToken = storage.getItem("access_token");
  const [isLoading, setIsLoading] = useState(true);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentVerificationError, setPaymentVerificationError] = useState<
    string | null
  >(null);
  const [retryCount, setRetryCount] = useState(0);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const maxRetries = 10; // Maximum number of retries (50 seconds)
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const axiosInstance = useAxios();

  const sessionId = searchParams.get("session_id");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Function to verify payment from Stripe Checkout Session
  const verifyPaymentFromCheckoutSession = async (sessionId: string) => {
    try {
      // Call our API to retrieve the checkout session
      const response = await fetch(
        `/api/get-checkout-session?session_id=${sessionId}`,
      );

      if (!response.ok) {
        setPaymentVerificationError("Failed to verify payment");
        return false;
      }

      const session = await response.json();

      // Extract payment intent ID and order ID from session
      if (session.payment_intent) {
        setPaymentIntentId(session.payment_intent);
      }

      // Extract order ID from metadata
      if (session.metadata?.orderId) {
        setOrderId(session.metadata.orderId);
      }

      // Check payment status
      if (session.payment_status === "paid") {
        setPaymentVerified(true);
        return true;
      } else if (session.payment_status === "unpaid") {
        setPaymentVerificationError("Payment was not completed");
        return false;
      } else {
        setPaymentVerificationError(
          `Payment status: ${session.payment_status}`,
        );
        return false;
      }
    } catch (error) {
      setPaymentVerificationError("Failed to verify payment");
      console.error("Error verifying payment:", error);
      return false;
    }
  };

  // Update document title based on payment status
  useEffect(() => {
    if (isLoading) {
      document.title = t("checkingPayment") + " | Revsticks";
    } else if (paymentVerified) {
      document.title = t("paymentSucceeded") + " | Revsticks";
    } else {
      document.title = t("paymentFailed") + " | Revsticks";
    }
  }, [isLoading, paymentVerified, t]);

  const updateOrderStatus = async (
    orderId: string,
    paymentIntentId: string,
  ) => {
    try {
      const response = await axiosInstance.post<PaymentSuccessResponse>(
        `/orders/${orderId}/paymentSuccess`,
        {
          paymentId: paymentIntentId,
        },
      );
      setUpdateSuccess(true);

      // Clear cart using the CartContext method (it already handles the API call correctly)
      await clearCart();

      return response.data;
    } catch (error) {
      console.error("Error updating order status:", error);
      return null;
    }
  };

  const generateDiscountCode = async (orderId: string) => {
    try {
      const response = await axiosInstance.post<DiscountCodeResponse>(
        `/discounts/generate/${orderId}`,
      );
      if (response.data && response.data.code) {
        setDiscountCode(response.data.code);
      }
    } catch (error) {
      console.error("Error generating discount code:", error);
      // Don't show error to user, discount is a bonus feature
    }
  };

  // Cleanup function to clear interval
  const cleanupRetryInterval = () => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handlePaymentVerification = async () => {
      if (!sessionId) {
        setPaymentVerificationError("No session ID found");
        setIsLoading(false);
        return;
      }

      try {
        // Verify payment from Stripe Checkout Session
        await verifyPaymentFromCheckoutSession(sessionId);
      } catch (error) {
        setPaymentVerificationError("Payment verification failed");
        console.error("Error verifying payment:", error);
      } finally {
        // Only stop loading after verification is complete
        setIsLoading(false);
      }
    };

    handlePaymentVerification();

    // Cleanup all timers and intervals when component unmounts
    return () => {
      cleanupRetryInterval();
    };
  }, [sessionId]);

  // Update order status when both order ID and payment intent ID are available
  useEffect(() => {
    const updateOrder = async () => {
      if (!orderId || !paymentIntentId || !paymentVerified) {
        return;
      }

      // Update the order status
      const result = await updateOrderStatus(orderId, paymentIntentId);

      // If initial update fails, set up retry interval
      if (!result && !updateSuccess) {
        // Clear any existing interval
        cleanupRetryInterval();

        // Set up new retry interval
        retryIntervalRef.current = setInterval(async () => {
          if (updateSuccess || retryCount >= maxRetries) {
            cleanupRetryInterval();
            return;
          }
          const retryResult = await updateOrderStatus(orderId, paymentIntentId);

          if (retryResult) {
            // Success, no need to retry anymore
            cleanupRetryInterval();
          } else {
            // Failed again, increment retry counter
            setRetryCount((prev) => prev + 1);
          }
        }, 5000); // Retry every 5 seconds
      }
    };

    updateOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentIntentId, paymentVerified, updateSuccess, retryCount]);

  // Generate discount code after successful order update
  useEffect(() => {
    if (updateSuccess && orderId && !discountCode) {
      generateDiscountCode(orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSuccess, orderId]);

  if (isLoading) {
    return (
      <div className={`${oswald.variable} ${dmSans.variable} min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-4`}>
        <div className="bg-zinc-900 border border-zinc-800 p-10 w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
          </div>
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("checkingPayment")}
          </p>
        </div>
      </div>
    );
  }

  // Handle payment success (now based on actual Stripe verification)
  if (paymentVerified) {
    return (
      <div className={`${oswald.variable} ${dmSans.variable} min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4 py-16`}>
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md overflow-hidden">
          {/* Amber top bar */}
          <div className="h-1 w-full bg-amber-500" />

          <div className="p-8 sm:p-10">
            {/* Success icon */}
            <div className="w-14 h-14 mx-auto mb-8 border-2 border-amber-500 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>

            <h2
              className="text-2xl font-bold mb-3 text-white text-center uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("paymentSucceeded")}
            </h2>
            <p
              className="text-zinc-400 mb-1 text-center text-sm"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {t("thankYou")}
            </p>
            <p
              className="text-zinc-500 mb-8 text-center text-sm"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {t("orderProcessing")}
            </p>

            <div className="border border-zinc-800 bg-zinc-950 p-3 mb-8">
              <p
                className="text-xs uppercase tracking-[0.15em] text-zinc-500"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("orderId")}:{" "}
                <span className="text-amber-400 font-bold">{orderId}</span>
              </p>
            </div>

            {discountCode && (
              <div className="border-2 border-amber-500 bg-zinc-950 p-5 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <h3
                    className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("discountTitle") || "Special Offer!"}
                  </h3>
                </div>
                <p
                  className="text-center text-zinc-400 text-xs mb-4"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {t("discountMessage") ||
                    "Get 10% off your next order with this code:"}
                </p>
                <div className="border border-zinc-800 bg-zinc-900 p-3 text-center">
                  <code
                    className="text-xl font-bold text-amber-400 tracking-[0.25em]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {discountCode}
                  </code>
                </div>
                <p
                  className="text-center text-zinc-600 text-xs mt-2 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("discountValidity") || "Valid for one-time use"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href={`/${locale}`}
                className="flex-1 min-w-0 px-5 py-3 bg-zinc-800 text-zinc-200 text-xs font-bold uppercase tracking-[0.15em] hover:bg-zinc-700 transition-colors text-center flex items-center justify-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("continueShopping")}
              </Link>
              {accessToken && (
                <Link
                  href={`/${locale}/history`}
                  className="flex-1 min-w-0 px-5 py-3 bg-amber-500 text-zinc-950 text-xs font-bold uppercase tracking-[0.15em] hover:bg-amber-400 transition-colors text-center flex items-center justify-center"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("viewHistory")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle payment failure or other status
  return (
      <div className={`${oswald.variable} ${dmSans.variable} min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4 py-16`}>
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md overflow-hidden">
        {/* Red top bar for failure */}
        <div className="h-1 w-full bg-red-600" />

        <div className="p-8 sm:p-10">
          {/* Error icon */}
          <div className="w-14 h-14 mx-auto mb-8 border-2 border-red-600 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </div>

          <h2
            className="text-2xl font-bold mb-3 text-white text-center uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("paymentFailed")}
          </h2>
          <p
            className="text-zinc-400 mb-8 text-center text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {paymentVerificationError || t("paymentErrorMessage")}
          </p>

          {paymentIntentId && (
            <div className="border border-zinc-800 bg-zinc-950 p-3 mb-8">
              <p
                className="text-xs uppercase tracking-[0.15em] text-zinc-500"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("paymentId")}:{" "}
                <span className="text-zinc-300 font-bold">{paymentIntentId}</span>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href={`/${locale}/checkout`}
              className="flex-1 min-w-0 px-5 py-3 bg-zinc-800 text-zinc-200 text-xs font-bold uppercase tracking-[0.15em] hover:bg-zinc-700 transition-colors text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("backToCheckout")}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="flex-1 min-w-0 px-5 py-3 bg-red-600 text-white text-xs font-bold uppercase tracking-[0.15em] hover:bg-red-500 transition-colors text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("contactSupport")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
