"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CircularProgress } from "@mui/material";
import {
  RecommendationsResponse,
  RecommendationItem,
} from "@/hooks/useRecommendations";

interface PriceCalculation {
  totalPrice: number;
  shipmentCost: number;
  stickersPrice: number;
  partsPrice: number;
  powdercoatServicesPrice: number;
  percentageDiscount: number;
  codeDiscount: number;
  totalQuantity: number;
  freeShippingThreshold: number;
}

interface RecommendationsSectionProps {
  recommendations: RecommendationsResponse | null;
  isLoading: boolean;
  error: string | null;
  priceCalculation: PriceCalculation | null;
}

export default function RecommendationsSection({
  recommendations,
  isLoading,
  error,
  priceCalculation,
}: RecommendationsSectionProps) {
  const t = useTranslations("cart");
  const { locale } = useParams();

  // Don't show if loading, error, no recommendations, or already at target
  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center">
          <CircularProgress size={20} className="text-purple-600" />
          <span className="ml-3 text-sm text-gray-700">
            {t("loadingRecommendations")}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-700">{t("recommendationError")}</p>
      </div>
    );
  }

  if (!recommendations || recommendations.recommendations.length === 0) {
    return null;
  }

  // Get translation for an item based on current locale
  const getItemTranslation = (item: RecommendationItem) => {
    if (!item.data.translations || item.data.translations.length === 0) {
      return { title: "Product", description: "" };
    }

    const translation =
      item.data.translations.find((t) => t.language === locale) ||
      item.data.translations[0];

    return {
      title: translation.title || "Product",
      description: translation.description || "",
    };
  };

  // Get the first image URL for an item from the API response
  const getItemImageUrl = (item: RecommendationItem) => {
    // Handle case where images is null or undefined
    if (!item.images) {
      return null;
    }

    // Handle case where images is a single string or array
    const imageName =
      typeof item.images === "string" ? item.images : item.images[0];

    if (!imageName) {
      return null;
    }

    // Build the full URL based on item type
    if (item.type === "part") {
      return `https://minio-api.cwx-dev.com/parts/${imageName}`;
    } else if (item.type === "sticker") {
      return `https://minio-api.cwx-dev.com/stickers/${imageName}`;
    } else if (item.type === "powdercoat") {
      return `https://minio-api.cwx-dev.com/powdercoat-services/${imageName}`;
    }

    return null;
  };

  // Get the product page URL based on item type
  const getProductUrl = (item: RecommendationItem) => {
    if (item.type === "part") {
      return `/${locale}/part/${item.slug}`;
    } else if (item.type === "sticker") {
      return `/${locale}/sticker/${item.slug}`;
    } else if (item.type === "powdercoat") {
      return `/${locale}/powdercoat/${item.slug}`;
    }
    return `/${locale}`;
  };

  // Calculate free shipping progress
  const currentTotal = priceCalculation
    ? (priceCalculation.stickersPrice || 0) +
      (priceCalculation.partsPrice || 0) +
      (priceCalculation.powdercoatServicesPrice || 0)
    : 0;
  const threshold = priceCalculation?.freeShippingThreshold || 100;
  const remaining = threshold - currentTotal;
  const progress = Math.min((currentTotal / threshold) * 100, 100);

  return (
    <div className="border-2 border-purple-400 rounded-lg p-3 sm:p-4 mb-4 w-full">
      {/* Free Shipping Progress Bar */}
      {priceCalculation && priceCalculation.freeShippingThreshold > 0 && (
        <div className="mb-3">
          {remaining > 0 ? (
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                CHF {remaining.toFixed(2)} {t("almostFreeShipping")}
              </p>
            </div>
          ) : (
            <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {t("freeShippingUnlocked")}
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start mb-2 sm:mb-3">
        <div className="flex-shrink-0">
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
        </div>
        <div className="ml-2 flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 break-words">
            {t("recommendationsTitle")}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 break-words">
            {t("recommendationsSubtitle", {
              amount: recommendations.neededAmount.toFixed(2),
            })}
          </p>
        </div>
      </div>

      {/* Recommended Items */}
      <div className="mt-3 md:mt-4">
        <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
          {t("recommendedItems")}
        </p>
        <div className="space-y-2 sm:space-y-3">
          {recommendations.recommendations.map((item, index) => {
            const translation = getItemTranslation(item);
            const imageUrl = getItemImageUrl(item);

            return (
              <div
                key={`${item.id}-${index}`}
                className="bg-white rounded-lg p-2 sm:p-3 md:p-4 flex flex-col gap-2 sm:gap-3 md:gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  {/* Image */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <Image
                      src={imageUrl || "/192x192.png"}
                      alt={translation.title}
                      fill
                      className="object-contain"
                      unoptimized={!!imageUrl}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes("/192x192.png")) {
                          target.src = "/192x192.png";
                        }
                      }}
                    />
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {translation.title}
                    </h4>
                    {translation.description && (
                      <p className="hidden sm:block text-xs text-gray-600 mt-1 break-words">
                        {translation.description.length > 20
                          ? `${translation.description.substring(0, 20)}...`
                          : translation.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm font-bold text-purple-700 shrink-0">
                        CHF {item.price.toFixed(2)}
                      </span>
                      {item.type && (
                        <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0">
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Cart Button - Now links to product page */}
                <Link
                  href={getProductUrl(item)}
                  className="w-full bg-purple-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-purple-800 transition-colors text-center block"
                >
                  {t("addToCart")}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Total with items info */}
        {recommendations.totalWithItems && (
          <div className="mt-2 sm:mt-3 p-2 bg-purple-50 rounded-md">
            <p className="text-xs text-purple-700 break-words">
              <span className="font-semibold">
                Total with recommended items:
              </span>{" "}
              CHF {recommendations.totalWithItems.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
