"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartContext";
import useAxios from "@/useAxios";
import storage from "@/lib/storage";

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
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
          <p className="text-gray-600">{t("checkingPayment")}</p>
        </div>
      </div>
    );
  }

  // Handle payment success (now based on actual Stripe verification)
  if (paymentVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-600 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
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

          <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">
            {t("paymentSucceeded")}
          </h2>
          <p className="text-gray-600 mb-2 text-center">{t("thankYou")}</p>
          <p className="text-gray-600 mb-6 text-center">
            {t("orderProcessing")}
          </p>

          <div className="bg-gray-50 rounded p-3 mb-6 text-sm">
            <p className="text-gray-500">
              {t("orderId")}:{" "}
              <span className="font-medium text-gray-700">{orderId}</span>
            </p>
          </div>

          {discountCode && (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <svg
                  className="w-5 h-5 text-purple-600 mr-2"
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
                <h3 className="text-lg font-bold text-purple-800">
                  {t("discountTitle") || "Special Offer!"}
                </h3>
              </div>
              <p className="text-center text-purple-700 text-sm mb-3">
                {t("discountMessage") ||
                  "Get 10% off your next order with this code:"}
              </p>
              <div className="bg-white rounded-md p-3 text-center">
                <code className="text-2xl font-bold text-purple-600 tracking-wider">
                  {discountCode}
                </code>
              </div>
              <p className="text-center text-purple-600 text-xs mt-2">
                {t("discountValidity") || "Valid for one-time use"}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link
              href={`/${locale}`}
              className="flex-1 min-w-0 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center flex items-center justify-center"
            >
              {t("continueShopping")}
            </Link>
            {accessToken && (
              <Link
                href={`/${locale}/history`}
                className="flex-1 min-w-0 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 text-center flex items-center justify-center"
              >
                {t("viewHistory")}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle payment failure or other status
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
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

        <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">
          {t("paymentFailed")}
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          {paymentVerificationError || t("paymentErrorMessage")}
        </p>

        {paymentIntentId && (
          <div className="bg-gray-50 rounded p-3 mb-6 text-sm">
            <p className="text-gray-500">
              {t("paymentId")}:{" "}
              <span className="font-medium text-gray-700">
                {paymentIntentId}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link
            href={`/${locale}/checkout`}
            className="flex-1 min-w-0 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center"
          >
            {t("backToCheckout")}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="flex-1 min-w-0 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 text-center"
          >
            {t("contactSupport")}
          </Link>
        </div>
      </div>
    </div>
  );
}
