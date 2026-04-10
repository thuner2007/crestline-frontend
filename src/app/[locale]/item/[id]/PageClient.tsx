"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Oswald, DM_Sans } from "next/font/google";
import { PartCartItem, useCart } from "@/components/CartContext";
import useAxios from "@/useAxios";
import ImageCarousel from "@/components/ImageCarousel";
import LeftiImageLayout from "@/components/LeftiImageLayout";

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
import {
  ColorOption,
  DropdownOption,
  InputFieldOption,
  VinylColorsOption,
  PowdercoatColorsOption,
  FilamentColorOption,
} from "@/types/sticker/customizazion.type";
import { Part } from "./page";

interface CustomizationOptionWithValue {
  type: string;
  translations: {
    en: { title: string; description: string };
    de: { title: string; description: string };
    fr: { title: string; description: string };
    it: { title: string; description: string };
  };
  priceAdjustment?: number;
  selectedValue?: string;
  selectedItemTranslations?: {
    en: { title: string };
    de: { title: string };
    fr: { title: string };
    it: { title: string };
  };
  max?: number;
  items?: Array<{
    id: string;
    priceAdjustment: number;
    translations: {
      en: { title: string; description?: string };
      de: { title: string; description?: string };
      fr: { title: string; description?: string };
      it: { title: string; description?: string };
    };
  }>;
  filamentTypeId?: string;
  filamentTypeName?: string;
  colors?: Array<{
    id: string;
    value: string;
    priceAdjustment?: number;
  }>;
}

// Helper to process image/video URLs
function processMediaUrls(urls: string[] | undefined): string[] {
  if (!urls || urls.length === 0) return [];
  return urls.map((url) =>
    url.startsWith("http") ? url : `https://minio-api.cwx-dev.com/parts/${url}`,
  );
}

interface PartPageClientProps {
  initialPart?: Part | null;
}

export default function PartPageClient({ initialPart }: PartPageClientProps) {
  const t = useTranslations("parts");
  const { locale } = useParams();
  const { addItem } = useCart();
  const axiosInstance = useAxios();
  const params = useParams();
  const partIdentifier = params.id; // Can be either UUID or name

  const [part, setPart] = useState<Part | null>(initialPart ?? null);
  const [quantity, setQuantity] = useState(1);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [customization, setCustomization] = useState<
    Array<CustomizationOptionWithValue>
  >([]);
  const [totalPrice, setTotalPrice] = useState<number>(
    initialPart ? parseFloat(initialPart.price) : 0,
  );
  const [loading, setLoading] = useState(!initialPart);
  const [error, setError] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<string[]>(
    processMediaUrls(initialPart?.images),
  );
  const [processedVideos, setProcessedVideos] = useState<string[]>(
    processMediaUrls(initialPart?.videos),
  );
  const [availablePowdercoatColors, setAvailablePowdercoatColors] = useState<
    string[]
  >([]);
  const [availableVinylColors, setAvailableVinylColors] = useState<string[]>(
    [],
  );

  // Fetch powdercoat colors
  const fetchPowdercoatColors = async () => {
    try {
      const { data } = await axiosInstance.get<string[]>("/powdercoat-colors");
      setAvailablePowdercoatColors(data || []);
    } catch (error) {
      console.error("Error fetching powdercoat colors:", error);
      setAvailablePowdercoatColors([]);
    }
  };

  // Fetch vinyl colors
  const fetchVinylColors = async () => {
    try {
      const { data } = await axiosInstance.get<string[]>("/vinyl-colors");
      setAvailableVinylColors(data || []);
    } catch (error) {
      console.error("Error fetching vinyl colors:", error);
      setAvailableVinylColors([]);
    }
  };

  // Fetch filament colors for a specific filament type
  const fetchFilamentColors = async (filamentTypeName: string) => {
    try {
      const { data } = await axiosInstance.get<
        | Array<{ id: string; color: string }>
        | { colors?: Array<{ id: string; color: string }> }
      >(`/available-colors/filament/${filamentTypeName}`);

      const colorsList = Array.isArray(data)
        ? data
        : (data as { colors?: Array<{ id: string; color: string }> }).colors ||
          [];

      return colorsList.map((item) => ({
        id: item.id,
        value: item.color,
        priceAdjustment: 0,
      }));
    } catch (error) {
      console.error(
        `Error fetching filament colors for ${filamentTypeName}:`,
        error,
      );
      return [];
    }
  };

  // Fetch part data with stock information
  const fetchPart = async () => {
    setLoading(true);
    try {
      // Try to fetch by name first, if it fails, try by ID (backward compatibility)
      const endpoint = `/parts/by-name/${encodeURIComponent(
        String(partIdentifier).replace(/-/g, " "),
      )}/with-stock`;
      const { data } = await axiosInstance.get<Part>(endpoint);
      setPart(data);

      // Process images and videos
      setProcessedImages(processMediaUrls(data.images));
      setProcessedVideos(processMediaUrls(data.videos));

      // Initialize price
      setTotalPrice(parseFloat(data.price));
    } catch (error) {
      console.error("Error fetching part:", error);
      setError("Failed to load part details");
    } finally {
      setLoading(false);
    }
  };

  // Initialize customization options with defaults
  useEffect(() => {
    const initializeCustomization = async () => {
      if (!part || (part?.customizationOptions?.options ?? []).length === 0) {
        return;
      }

      const options = part.customizationOptions.options;
      const initialCustomization = await Promise.all(
        options.map(async (option) => {
          let selectedValue = "";
          let selectedItemTranslations = undefined;

          // Set default value based on option type
          if (
            option.type === "dropdown" &&
            option.items &&
            option.items.length > 0
          ) {
            selectedValue = option.items[0].id;
            selectedItemTranslations = option.items[0].translations;
          } else if (option.type === "color") {
            // Default to black for color picker
            selectedValue = "#000000";
          }

          // Fetch colors for filamentColor options if not already populated
          if (option.type === "filamentColor") {
            const filamentOption = option as FilamentColorOption;
            const colors =
              !filamentOption.colors || filamentOption.colors.length === 0
                ? filamentOption.filamentTypeId
                  ? await fetchFilamentColors(filamentOption.filamentTypeId)
                  : []
                : filamentOption.colors;

            return {
              ...option,
              selectedValue,
              selectedItemTranslations,
              colors,
            } as CustomizationOptionWithValue;
          }

          return {
            ...option,
            selectedValue,
            selectedItemTranslations,
          } as CustomizationOptionWithValue;
        }),
      );

      setCustomization(initialCustomization);
    };

    initializeCustomization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  // Calculate total price whenever customization or quantity changes
  useEffect(() => {
    if (!part) return;

    let price = parseFloat(part.price);

    // Add price adjustments from customization options
    customization.forEach((option) => {
      if (option.priceAdjustment) {
        price += option.priceAdjustment;
      }

      // Add price adjustments from selected dropdown items
      if (option.type === "dropdown" && option.selectedValue) {
        const selectedItem = part.customizationOptions.options
          .find((o) => o.type === "dropdown")
          ?.items?.find((item) => item.id === option.selectedValue);

        if (selectedItem?.priceAdjustment) {
          price += selectedItem.priceAdjustment;
        }
      }
    });

    // Multiply by quantity
    setTotalPrice(price * quantity);
  }, [customization, quantity, part]);

  useEffect(() => {
    fetchPart();
    fetchPowdercoatColors();
    fetchVinylColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIdentifier]);

  // Function to remove emojis from text input
  const removeEmojis = (text: string): string => {
    // This regex matches most emoji characters including:
    // - Basic emoticons
    // - Unicode emoji
    // - Skin tone modifiers
    // - Zero-width joiners
    // - Variation selectors
    return text.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2000}-\u{200D}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F200}-\u{1F2FF}]/gu,
      "",
    );
  };

  // Helper function to convert color names to CSS values
  const getColorStyle = (colorName: string): string => {
    // If it's already a hex code, use it
    if (colorName.startsWith("#")) {
      return colorName;
    }

    // Handle transparent- prefix
    if (colorName.startsWith("transparent-")) {
      const baseColor = colorName.replace("transparent-", "");
      // Map common color names to their RGBA values with transparency
      const transparentColorMap: Record<string, string> = {
        red: "rgba(239, 68, 68, 0.5)",
        blue: "rgba(59, 130, 246, 0.5)",
        green: "rgba(34, 197, 94, 0.5)",
        yellow: "rgba(234, 179, 8, 0.5)",
        purple: "rgba(168, 85, 247, 0.5)",
        pink: "rgba(236, 72, 153, 0.5)",
        orange: "rgba(249, 115, 22, 0.5)",
        black: "rgba(0, 0, 0, 0.5)",
        white: "rgba(255, 255, 255, 0.8)",
        gray: "rgba(107, 114, 128, 0.5)",
        cyan: "rgba(6, 182, 212, 0.5)",
        lime: "rgba(132, 204, 22, 0.5)",
        indigo: "rgba(99, 102, 241, 0.5)",
      };
      return transparentColorMap[baseColor] || baseColor;
    }

    // Return the color name as-is for CSS standard colors
    return colorName;
  };

  const incrementQuantity = () => {
    if (!part) return;
    setQuantity((prev) => Math.min(prev + 1, part.quantity));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleCustomizationChange = (optionIndex: number, value: string) => {
    setCustomization((prev) => {
      const updated = [...prev];
      const option = updated[optionIndex];

      // Filter emojis for text input fields
      const filteredValue =
        option.type === "inputfield" ? removeEmojis(value) : value;

      updated[optionIndex] = {
        ...option,
        selectedValue: filteredValue,
      };

      // If it's a dropdown, also update the translations
      if (option.type === "dropdown" && part) {
        const selectedItem = part.customizationOptions.options
          .find((o) => o.type === "dropdown")
          ?.items?.find((item) => item.id === filteredValue);

        if (selectedItem) {
          updated[optionIndex].selectedItemTranslations =
            selectedItem.translations;
        }
      }

      return updated;
    });
  };

  // Check if all customization options are valid (selected and not out of stock)
  const isCustomizationValid = (() => {
    if (
      !part?.customizationOptions?.options ||
      part.customizationOptions.options.length === 0
    ) {
      return true;
    }

    if (customization.length === 0) return false;

    return customization.every((option) => {
      // Every option must have a selected value
      if (!option.selectedValue || option.selectedValue.trim() === "") {
        return false;
      }

      // For dropdowns, check if the selected item is out of stock
      if (option.type === "dropdown" && part) {
        const originalOption = part.customizationOptions.options.find(
          (o) =>
            o.type === "dropdown" &&
            o.translations.en.title === option.translations.en.title,
        );
        const selectedItem = originalOption?.items?.find(
          (item) => item.id === option.selectedValue,
        );
        if (
          selectedItem &&
          selectedItem.stock !== undefined &&
          selectedItem.stock <= 0
        ) {
          return false;
        }
      }

      return true;
    });
  })();

  const addToCart = () => {
    if (!part) return;

    // Trigger button animation
    setIsAddingToCart(true);
    setTimeout(() => setIsAddingToCart(false), 200);

    // Show checkmark after a short delay
    setTimeout(() => {
      setShowCheckmark(true);
      setTimeout(() => setShowCheckmark(false), 1500);
    }, 100);

    // Create cart item for a part
    const cartItem: PartCartItem = {
      partId: part.id,
      amount: quantity,
      customizationOptions: {
        options: customization.map((option, index) => {
          // Use the index as a fallback numeric ID if needed
          const optionId = option.translations.en.title || index.toString();
          const selectedValue = option.selectedValue || "";

          // Create properly typed objects based on the option type
          switch (option.type) {
            case "inputfield":
              return {
                type: "inputfield" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                max: option.max,
                priceAdjustment: option.priceAdjustment,
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as InputFieldOption;

            case "dropdown":
              // Get the original dropdown option from the part to preserve its items
              const originalOption = part.customizationOptions.options.find(
                (o) =>
                  o.type === "dropdown" &&
                  o.translations.en.title === option.translations.en.title,
              ) as DropdownOption;

              return {
                type: "dropdown" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                priceAdjustment: option.priceAdjustment,
                items: originalOption?.items || [],
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as DropdownOption;

            case "color":
              return {
                type: "color" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                priceAdjustment: option.priceAdjustment,
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as ColorOption;

            case "vinylColors":
              return {
                type: "vinylColors" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                priceAdjustment: option.priceAdjustment,
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as VinylColorsOption;

            case "powdercoatColors":
              return {
                type: "powdercoatColors" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                priceAdjustment: option.priceAdjustment,
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as PowdercoatColorsOption;

            case "filamentColor":
              return {
                type: "filamentColor" as const,
                translations: {
                  en: { title: optionId },
                  de: { title: optionId },
                  fr: { title: optionId },
                  it: { title: optionId },
                },
                applicableTo: "both" as const,
                priceAdjustment: option.priceAdjustment,
                filamentTypeId: option.filamentTypeId,
                filamentTypeName: option.filamentTypeName,
                colors: option.colors,
                // Store the user's selection in a hidden attribute for backend processing
                value: selectedValue,
              } as FilamentColorOption;

            default:
              // Handle any other cases or throw an error
              throw new Error(
                `Unknown customization option type: ${option.type}`,
              );
          }
        }),
      },
      part: part,
      type: "part",
      // Store the user's selections in a format convenient for the cart display
    };

    // Add to cart - the useCart hook's addItem function has been updated to use the new endpoints
    addItem(cartItem);

    // Show confirmation
    setShowAddedToCart(true);
    setTimeout(() => {
      setShowAddedToCart(false);
    }, 3000);
  };

  // Render customization option based on type
  const renderCustomizationOption = (
    option: CustomizationOptionWithValue,
    index: number,
  ) => {
    const optionTitle =
      typeof locale === "string" &&
      (locale === "en" || locale === "de" || locale === "fr" || locale === "it")
        ? option.translations[locale as "en" | "de" | "fr" | "it"]?.title
        : option.translations.en.title;

    const optionDescription =
      typeof locale === "string" &&
      (locale === "en" || locale === "de" || locale === "fr" || locale === "it")
        ? option.translations[locale as "en" | "de" | "fr" | "it"]?.description
        : option.translations.en.description;

    switch (option.type) {
      case "inputfield":
        return (
          <div key={optionTitle} className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
              {optionTitle}
              {optionDescription && (
                <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                  {optionDescription}
                </p>
              )}
            </label>
            <input
              type="text"
              maxLength={option.max}
              value={option.selectedValue || ""}
              onChange={(e) => handleCustomizationChange(index, e.target.value)}
              className="mt-2 block w-full h-9 px-3 bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-zinc-600"
            />
          </div>
        );

      case "dropdown":
        return (
          <div key={optionTitle} className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
              {optionTitle}
              {optionDescription && (
                <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                  {optionDescription}
                </p>
              )}
            </label>
            <select
              value={option.selectedValue || ""}
              onChange={(e) => handleCustomizationChange(index, e.target.value)}
              className="mt-2 block w-full border border-zinc-700 bg-zinc-900 text-white py-2 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {part &&
                part.customizationOptions.options
                  .find(
                    (o) =>
                      o.type === "dropdown" &&
                      o.translations.en.title === option.translations.en.title,
                  )
                  ?.items?.map((item) => {
                    const isOutOfStock =
                      item.stock !== undefined && item.stock <= 0;
                    const itemTitle =
                      typeof locale === "string" &&
                      (locale === "en" ||
                        locale === "de" ||
                        locale === "fr" ||
                        locale === "it")
                        ? item.translations[locale as "en" | "de" | "fr" | "it"]
                            ?.title
                        : item.translations.en.title;

                    return (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={isOutOfStock}
                        className="bg-zinc-900 text-white"
                        style={isOutOfStock ? { color: "#52525b" } : undefined}
                      >
                        {itemTitle}
                        {item.priceAdjustment !== undefined &&
                          item.priceAdjustment !== 0 &&
                          ` (+CHF ${item.priceAdjustment.toFixed(2)})`}
                        {isOutOfStock && ` - ${t("outOfStock")}`}
                      </option>
                    );
                  })}
            </select>
          </div>
        );

      case "color":
        return (
          <div key={optionTitle} className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
              {optionTitle}
              {optionDescription && (
                <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                  {optionDescription}
                </p>
              )}
            </label>
            <input
              type="color"
              value={option.selectedValue || "#000000"}
              onChange={(e) => handleCustomizationChange(index, e.target.value)}
              className="mt-2 block h-10 w-full border border-zinc-700 bg-zinc-900 cursor-pointer focus:border-amber-500 focus:outline-none"
            />
          </div>
        );

      case "powdercoatColors":
        if (part?.type === "Lefti") {
          return (
            <div key={optionTitle} className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3" style={{ fontFamily: "var(--font-display)" }}>
                {optionTitle}
                {optionDescription && (
                  <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                    {optionDescription}
                  </p>
                )}
                {option.priceAdjustment !== undefined &&
                  option.priceAdjustment !== 0 && (
                    <p className="mt-1 text-xs text-amber-400 normal-case tracking-normal font-normal">
                      +CHF {option.priceAdjustment.toFixed(2)} per color
                    </p>
                  )}
              </label>
              <div className="flex flex-wrap gap-2">
                {availablePowdercoatColors.map((color) => (
                  <div
                    key={color}
                    onClick={() => handleCustomizationChange(index, color)}
                    className={`cursor-pointer border-2 transition-all duration-200 hover:scale-110 ${
                      option.selectedValue === color
                        ? "border-amber-400 ring-2 ring-amber-400/30"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                  >
                    <div
                      className="w-8 h-8"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                ))}
              </div>
              {option.selectedValue && (
                <p className="mt-2 text-xs text-zinc-400 uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  Selected:{" "}
                  <span className="text-amber-400">
                    {option.selectedValue.charAt(0).toUpperCase() +
                      option.selectedValue.slice(1)}
                  </span>
                </p>
              )}
            </div>
          );
        } else {
          return (
            <div key={optionTitle} className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                {optionTitle}
                {optionDescription && (
                  <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                    {optionDescription}
                  </p>
                )}
              </label>
              <select
                value={option.selectedValue || ""}
                onChange={(e) =>
                  handleCustomizationChange(index, e.target.value)
                }
                className="mt-2 block w-full border border-zinc-700 bg-zinc-900 text-white py-2 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="" className="bg-zinc-900">Select a powdercoat color</option>
                {availablePowdercoatColors.map((color) => (
                  <option key={color} value={color} className="bg-zinc-900">
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                    {option.priceAdjustment !== undefined &&
                      option.priceAdjustment !== 0 &&
                      ` (+CHF ${option.priceAdjustment.toFixed(2)})`}
                  </option>
                ))}
              </select>
            </div>
          );
        }

      case "vinylColors":
        return (
          <div key={optionTitle} className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {optionTitle}
              {optionDescription && (
                <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                  {optionDescription}
                </p>
              )}
              {option.priceAdjustment !== undefined &&
                option.priceAdjustment !== 0 && (
                  <p className="mt-1 text-xs text-amber-400 normal-case tracking-normal font-normal">
                    +CHF {option.priceAdjustment.toFixed(2)} per color
                  </p>
                )}
            </label>
            <div className="flex flex-wrap gap-2">
              {availableVinylColors.map((color) => (
                <div
                  key={color}
                  onClick={() => handleCustomizationChange(index, color)}
                  className={`cursor-pointer border-2 transition-all duration-200 hover:scale-110 ${
                    option.selectedValue === color
                      ? "border-amber-400 ring-2 ring-amber-400/30"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                >
                  <div
                    className="w-8 h-8"
                    style={{ backgroundColor: getColorStyle(color) }}
                  />
                </div>
              ))}
            </div>
            {option.selectedValue && (
              <p className="mt-2 text-xs text-zinc-400 uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                Selected:{" "}
                <span className="text-amber-400">
                  {option.selectedValue.charAt(0).toUpperCase() +
                    option.selectedValue.slice(1)}
                </span>
              </p>
            )}
          </div>
        );

      case "filamentColor":
        return (
          <div key={optionTitle} className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {optionTitle}
              {optionDescription && (
                <p className="mt-1 text-xs text-zinc-500 normal-case tracking-normal font-normal">
                  {optionDescription}
                </p>
              )}
              {option.priceAdjustment !== undefined &&
                option.priceAdjustment !== 0 && (
                  <p className="mt-1 text-xs text-amber-400 normal-case tracking-normal font-normal">
                    +CHF {option.priceAdjustment.toFixed(2)} per color
                  </p>
                )}
            </label>
            {option.colors && option.colors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {option.colors.map((color) => (
                    <div
                      key={color.id}
                      onClick={() => handleCustomizationChange(index, color.id)}
                      className={`cursor-pointer border-2 p-2 transition-all duration-200 hover:scale-105 ${
                        option.selectedValue === color.id
                          ? "border-amber-400 ring-2 ring-amber-400/30 bg-zinc-800"
                          : "border-zinc-700 hover:border-zinc-500 bg-zinc-900"
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <div
                          className="w-10 h-10 border border-zinc-700"
                          style={{
                            backgroundColor: getColorStyle(color.value),
                          }}
                          title={color.value}
                        />
                        <span className="text-xs font-medium text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                          {color.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {option.selectedValue && (
                  <p className="mt-2 text-xs text-zinc-400 uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                    Selected:{" "}
                    <span className="text-amber-400">
                      {option.colors.find((c) => c.id === option.selectedValue)
                        ?.value || ""}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No colors available for this filament type.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className={`flex justify-center items-center h-96 bg-zinc-950 ${oswald.variable} ${dmSans.variable}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400" />
          <p className="text-zinc-400 text-sm uppercase tracking-widest" style={{ fontFamily: "var(--font-display)" }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-zinc-950 min-h-[60vh] ${oswald.variable} ${dmSans.variable}`}>
        <div className="border border-zinc-800 bg-zinc-900 p-6 flex items-center gap-3">
          <p className="text-red-400">{error || t("errors.notFound")}</p>
        </div>
      </div>
    );
  }

  // Find translation for the current locale
  const translation =
    part.translations.find((t) => t.language === locale) ||
    part.translations.find((t) => t.language === "en");

  // Get shipping status color and text
  const getShippingStatusInfo = (
    shippingReady: string,
    shippingDate?: string,
  ) => {
    switch (shippingReady) {
      case "now":
        return {
          color: "bg-green-100 text-green-800",
          text: t("shippingStatus.now"),
        };
      case "in_1_3_days":
        return {
          color: "bg-yellow-100 text-yellow-800",
          text: t("shippingStatus.in_1_3_days"),
        };
      case "in_4_7_days":
        return {
          color: "bg-orange-100 text-orange-800",
          text: t("shippingStatus.in_4_7_days"),
        };
      case "in_8_14_days":
        return {
          color: "bg-red-100 text-red-800",
          text: t("shippingStatus.in_8_14_days"),
        };
      case "pre_order":
        const dateText = shippingDate
          ? new Date(shippingDate).toLocaleDateString(
              typeof locale === "string" ? locale : "en",
              { year: "numeric", month: "short", day: "numeric" },
            )
          : "TBD";
        return {
          color: "bg-blue-100 text-blue-800",
          text: `Pre-order (Ships: ${dateText})`,
        };
      case "unknown":
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          text: t("shippingStatus.unknown"),
        };
    }
  };

  const shippingInfo = getShippingStatusInfo(
    Array.isArray(part.shippingReady)
      ? part.shippingReady[0] || "unknown"
      : part.shippingReady || "unknown",
    part.shippingDate,
  );

  return (
    <>
      <div className={`${oswald.variable} ${dmSans.variable} w-full bg-zinc-950 min-h-[80vh]`} style={{ fontFamily: "var(--font-body)" }}>
        <div className="max-w-[1400px] w-full mx-auto px-6 sm:px-10 lg:px-16 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20">
            {/* Left column - Images and Videos */}
            <div className="space-y-8 w-full">
              {processedImages.length > 0 &&
                (part.type === "Lefti" ? (
                  <div className="rounded-none overflow-hidden border border-zinc-800 bg-zinc-900">
                    <LeftiImageLayout images={processedImages} />
                  </div>
                ) : (
                  <div className="w-full lg:min-h-[600px] overflow-hidden border border-zinc-800 bg-zinc-900">
                    <ImageCarousel images={processedImages} />
                  </div>
                ))}

              {/* Videos Section */}
              {processedVideos && processedVideos.length > 0 && (
                <div className="w-full space-y-4">
                  <div
                    className={`grid gap-5 ${
                      processedVideos.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-2"
                    }`}
                  >
                    {processedVideos.map((video, index) => (
                      <div
                        key={index}
                        className="group relative overflow-hidden border border-zinc-800 bg-zinc-900 transition-all duration-500 hover:border-amber-500/50 aspect-square"
                      >
                        <video
                          src={video}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                          preload="metadata"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Part details */}
            <div className="space-y-6">
              <div>
                <p
                  className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400 mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="h-px w-8 bg-amber-400" />
                  {t("customOptions") ? t("customOptions").replace(/\s.*/, "") : "Part"}
                </p>
                <h2
                  className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {translation?.title}
                </h2>
              </div>

              {/* Price */}
              <div className="space-y-2">
                {part.initialPrice &&
                parseFloat(part.initialPrice) > parseFloat(part.price) ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="text-2xl font-bold text-red-400"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      CHF {parseFloat(part.price).toFixed(2)}
                    </div>
                    <div className="text-lg font-medium text-zinc-500 line-through">
                      CHF {parseFloat(part.initialPrice).toFixed(2)}
                    </div>
                    <div className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                      {Math.round(
                        ((parseFloat(part.initialPrice) -
                          parseFloat(part.price)) /
                          parseFloat(part.initialPrice)) *
                          100,
                      )}
                      % OFF
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-2xl font-bold text-amber-400"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    CHF {parseFloat(part.price).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Shipping status */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  {t("shippingReady")}:
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${shippingInfo.color.replace("bg-green-100 text-green-800", "bg-green-900/40 text-green-400 border border-green-700").replace("bg-yellow-100 text-yellow-800", "bg-yellow-900/40 text-yellow-400 border border-yellow-700").replace("bg-orange-100 text-orange-800", "bg-orange-900/40 text-orange-400 border border-orange-700").replace("bg-red-100 text-red-800", "bg-red-900/40 text-red-400 border border-red-700").replace("bg-blue-100 text-blue-800", "bg-blue-900/40 text-blue-400 border border-blue-700").replace("bg-gray-100 text-gray-800", "bg-zinc-800 text-zinc-400 border border-zinc-700")}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {shippingInfo.text}
                </span>
              </div>

              {/* Compatible Bike Models */}
              {part.bikeModels && part.bikeModels.length > 0 && (
                <div className="border border-zinc-700 bg-zinc-900 p-4">
                  <h3
                    className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    🏍️ {t("compatibleWith")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {part.bikeModels.map((bike) => (
                      <span
                        key={bike.id}
                        className="inline-flex items-center px-3 py-1 border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-medium uppercase tracking-wide"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {bike.manufacturer} {bike.model}
                        {bike.year && ` (${bike.year})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Customization Options */}
              {part.customizationOptions?.options &&
                part.customizationOptions.options.length > 0 && (
                  <div className="border-t border-b border-zinc-800 py-5 space-y-4">
                    <h3
                      className="text-xs font-semibold uppercase tracking-widest text-amber-400"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {t("customOptions")}
                    </h3>
                    <div className="space-y-4">
                      {customization.map((option, index) =>
                        renderCustomizationOption(option, index),
                      )}
                    </div>
                  </div>
                )}

              {/* Quantity selector */}
              <div className="border-t border-b border-zinc-800 py-5">
                <h3
                  className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("quantity")}
                </h3>
                <div className="flex items-center">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="p-2 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="px-6 py-1.5 border-t border-b border-zinc-700 bg-zinc-900 text-center min-w-[60px] text-white font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {quantity}
                  </div>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= part.quantity}
                    className="p-2 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Total price */}
              <div className="flex justify-between items-baseline">
                <span
                  className="text-xs font-semibold uppercase tracking-widest text-zinc-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("totalPrice")}
                </span>
                <span
                  className="text-2xl font-bold text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  CHF {totalPrice.toFixed(2)}
                </span>
              </div>

              {/* Add to Cart Button */}
              <motion.button
                onClick={addToCart}
                className={`w-full px-6 py-4 font-bold text-sm uppercase tracking-widest transition-colors relative ${
                  showCheckmark
                    ? "bg-green-600 hover:bg-green-600 text-white"
                    : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                } disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed`}
                style={{ fontFamily: "var(--font-display)" }}
                disabled={
                  part.quantity === 0 || quantity < 1 || !isCustomizationValid
                }
                animate={isAddingToCart ? { scale: 0.97 } : { scale: 1 }}
                transition={{ duration: 0.1, ease: "easeInOut" }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.span
                  className="flex items-center justify-center"
                  animate={showCheckmark ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {part.quantity === 0 ? t("outOfStock") : t("addToCart")}
                </motion.span>
                <motion.span
                  className="absolute inset-0 flex items-center justify-center text-xl"
                  animate={
                    showCheckmark
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.5 }
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  ✅
                </motion.span>
              </motion.button>

              {/* Description */}
              {translation?.description && (
                <div className="border-t border-zinc-800 pt-5">
                  <h3
                    className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("description")}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {translation.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Accessories Section */}
          {part.accessories && part.accessories.length > 0 && (
            <div className="mt-20 border-t border-zinc-800 pt-10">
              <p
                className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400 mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="h-px w-8 bg-amber-400" />
                {t("accessories")}
              </p>
              <h2
                className="text-2xl font-bold uppercase tracking-tight text-white mb-8"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("accessories")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-zinc-800">
                {part.accessories.map((accessory) => {
                  const accessoryTranslation =
                    accessory.translations.find((t) => t.language === locale) ||
                    accessory.translations.find((t) => t.language === "en");

                  const firstImage = accessory.images[0];
                  const imageUrl = firstImage
                    ? firstImage.startsWith("http")
                      ? firstImage
                      : `https://minio-api.cwx-dev.com/parts/${firstImage}`
                    : "/placeholder.png";

                  return (
                    <Link
                      key={accessory.id}
                      href={`/${locale}/item/${
                        accessoryTranslation?.title
                          ?.toLowerCase()
                          .replace(/\s+/g, "-") || accessory.id
                      }`}
                      className="group relative flex flex-col bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                        <Image
                          src={imageUrl}
                          alt={accessoryTranslation?.title || "Accessory"}
                          fill
                          className="object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized={true}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/512x512.png";
                          }}
                        />
                        <div className="absolute inset-0 bg-amber-500/0 transition-colors duration-300 group-hover:bg-amber-500/10" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between border-t border-zinc-800 px-4 py-3 transition-colors duration-200 group-hover:border-amber-500/30 group-hover:bg-zinc-900">
                        <h3
                          className="line-clamp-2 text-xs font-bold uppercase leading-tight tracking-wide text-zinc-300 transition-colors duration-200 group-hover:text-white"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {accessoryTranslation?.title}
                        </h3>
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span
                            className="text-sm font-bold text-amber-400"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            CHF {parseFloat(accessory.price).toFixed(2)}
                          </span>
                          {accessory.quantity > 0 ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-green-500" style={{ fontFamily: "var(--font-display)" }}>
                              {t("inStock")}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600" style={{ fontFamily: "var(--font-display)" }}>
                              {t("outOfStock")}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Added to cart notification */}
      {typeof window !== "undefined" &&
        showAddedToCart &&
        createPortal(
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              style={{
                position: "fixed",
                top: "120px",
                right: "20px",
                zIndex: 9999999,
                backgroundColor: "rgba(245, 158, 11, 0.95)",
                color: "#0a0a0a",
                padding: "12px 24px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                fontSize: "13px",
                fontWeight: "700",
                fontFamily: "var(--font-display)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {t("addedToCart")}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
