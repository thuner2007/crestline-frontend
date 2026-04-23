"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Oswald, DM_Sans } from "next/font/google";
import { CartItem, priceSettings, useCart } from "@/components/CartContext";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  BaseCustomizationOption,
  CustomizationOption,
  CustomizationOptions,
  DropdownOption,
  OrderedItemCustomizationOption,
} from "@/types/sticker/customizazion.type";
import useAxios from "@/useAxios";
import { useRecommendations } from "@/hooks/useRecommendations";

interface PartSchemaItem {
  id: string;
  priceAdjustment?: number;
}

interface PartSchemaOption {
  type: string;
  priceAdjustment?: number;
  items?: PartSchemaItem[];
  translations?: Record<string, { title?: string }>;
}

interface PartSchema {
  options: PartSchemaOption[];
}

type RuntimeOption = CustomizationOption & {
  selectedValue?: string;
  value?: string;
  items?: PartSchemaItem[];
};

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

interface PriceCalculationResponse {
  totalPrice: number;
  shipmentCost: number;
  stickersPrice: number;
  partsPrice: number;
  powdercoatServicesPrice: number; // Added powdercoat services price
  percentageDiscount: number;
  codeDiscount: number;
  totalQuantity: number;
  freeShippingThreshold: number;
}

interface ItemPrice {
  price: number;
  loading: boolean;
  error: boolean;
}

// Helper function to get human-readable label for filament color options
const getFilamentColorLabel = (
  option: BaseCustomizationOption & {
    selectedValue?: string;
    value?: string;
    colors?: Array<{ id: string; value: string }>;
    colorDetails?: { id: string; color: string };
  },
): string => {
  const optionValue = option.selectedValue || option.value || "";
  if (!optionValue) return "";

  // Check colorDetails first (from server response)
  if (option.colorDetails && option.colorDetails.color) {
    return option.colorDetails.color;
  }

  // Look up the color name from the colors array on the option
  if (option.colors && Array.isArray(option.colors)) {
    const matchedColor = option.colors.find((c) => c.id === optionValue);
    if (matchedColor) return matchedColor.value;
  }

  return optionValue;
};

// Helper function to get human-readable label for dropdown options
const getDropdownLabel = (
  item: CartItem,
  option: BaseCustomizationOption & { selectedValue?: string; value?: string },
  locale: "de" | "en" | "fr" | "it" = "en",
): string => {
  if (option.type !== "dropdown") {
    return String(option.selectedValue || option.value || "");
  }

  // Get the value - could be in selectedValue or value field
  const optionValue = option.selectedValue || option.value || "";

  if (!optionValue) {
    return "";
  }

  // Handle stickers (only for regular Stickers, not CustomStickers)
  if (
    item.sticker &&
    "translations" in item.sticker &&
    item.sticker.customizationOptions
  ) {
    try {
      const options =
        typeof item.sticker.customizationOptions === "string"
          ? JSON.parse(item.sticker.customizationOptions).options
          : item.sticker.customizationOptions &&
              typeof item.sticker.customizationOptions === "object" &&
              "options" in item.sticker.customizationOptions
            ? (
                item.sticker.customizationOptions as {
                  options: CustomizationOption[];
                }
              ).options
            : [];

      // Find the dropdown option that matches this option's title (check all translations)
      let dropdownOption = options.find((o: CustomizationOption) => {
        if (o.type !== "dropdown") return false;

        // Check all translation keys for a match
        const partTitles = [
          o.translations?.en?.title,
          o.translations?.de?.title,
          o.translations?.fr?.title,
          o.translations?.it?.title,
        ].filter(Boolean);

        const optionTitles = [
          option.translations?.en?.title,
          option.translations?.de?.title,
          option.translations?.fr?.title,
          option.translations?.it?.title,
        ].filter(Boolean);

        // Check if any of the part titles match any of the option titles
        return partTitles.some((partTitle) =>
          optionTitles.some(
            (optTitle) => partTitle?.toLowerCase() === optTitle?.toLowerCase(),
          ),
        );
      });

      // If no match found, use the first dropdown option as fallback
      if (!dropdownOption) {
        dropdownOption = options.find(
          (o: CustomizationOption) => o.type === "dropdown",
        );
      }

      if (dropdownOption && "items" in dropdownOption && dropdownOption.items) {
        // Find the selected item by its ID (from value field)
        const selectedItem = dropdownOption.items.find(
          (i: {
            id: string;
            translations: Record<string, { title: string }>;
          }) => i.id === optionValue,
        );

        if (selectedItem && selectedItem.translations) {
          return (
            selectedItem.translations[locale]?.title ||
            selectedItem.translations.en?.title ||
            optionValue
          );
        }
      }

      return optionValue;
    } catch (error) {
      console.error("Error parsing sticker customization options:", error);
      return optionValue;
    }
  }

  // Handle parts
  if (item.part?.customizationOptions) {
    try {
      const options =
        typeof item.part.customizationOptions === "string"
          ? JSON.parse(item.part.customizationOptions).options
          : item.part.customizationOptions &&
              typeof item.part.customizationOptions === "object" &&
              "options" in item.part.customizationOptions
            ? (
                item.part.customizationOptions as {
                  options: CustomizationOption[];
                }
              ).options
            : [];

      // Find the dropdown option that matches this option's title (check all translations)
      let dropdownOption = options.find((o: CustomizationOption) => {
        if (o.type !== "dropdown") return false;

        // Check all translation keys for a match
        const partTitles = [
          o.translations?.en?.title,
          o.translations?.de?.title,
          o.translations?.fr?.title,
          o.translations?.it?.title,
        ].filter(Boolean);

        const optionTitles = [
          option.translations?.en?.title,
          option.translations?.de?.title,
          option.translations?.fr?.title,
          option.translations?.it?.title,
        ].filter(Boolean);

        // Check if any of the part titles match any of the option titles
        return partTitles.some((partTitle) =>
          optionTitles.some(
            (optTitle) => partTitle?.toLowerCase() === optTitle?.toLowerCase(),
          ),
        );
      });

      // If no match found, use the first dropdown option as fallback
      if (!dropdownOption) {
        dropdownOption = options.find(
          (o: CustomizationOption) => o.type === "dropdown",
        );
      }

      if (dropdownOption && "items" in dropdownOption && dropdownOption.items) {
        // Find the selected item by its ID (from value field)
        const selectedItem = dropdownOption.items.find(
          (i: {
            id: string;
            translations: Record<string, { title: string }>;
          }) => i.id === optionValue,
        );

        if (selectedItem && selectedItem.translations) {
          return (
            selectedItem.translations[locale]?.title ||
            selectedItem.translations.en?.title ||
            optionValue
          );
        }
      }

      return optionValue;
    } catch (error) {
      console.error("Error parsing part customization options:", error);
      return optionValue;
    }
  }

  return optionValue;
};

export default function CartPage() {
  const t = useTranslations("cart");
  const axiosInstance = useAxios();
  const {
    items,
    updateQuantity,
    removeItem,
    updatePowdercoatServiceQuantity,
    removePowdercoatService,
  } = useCart();
  const { locale } = useParams();
  const [priceCalculation, setPriceCalculation] =
    useState<PriceCalculationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<string, ItemPrice>>({});
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Calculate current cart total and item IDs for recommendations
  const currentCartTotal =
    (priceCalculation?.stickersPrice || 0) +
    (priceCalculation?.partsPrice || 0) +
    (priceCalculation?.powdercoatServicesPrice || 0);

  const itemsIdInCart = items
    .map((item) => {
      if (item.type === "powdercoat" && item.powdercoatService) {
        return item.powdercoatService.id;
      } else if (item.type === "part" && item.part) {
        return item.part.id;
      } else if (item.sticker) {
        return item.sticker.id;
      }
      return "";
    })
    .filter(Boolean);

  // Use recommendations hook
  useRecommendations({
    costAmount: currentCartTotal,
    itemsIdInCart,
    enabled: items.length > 0 && currentCartTotal < 100,
  });

  // Generate a unique key for each cart item
  const getItemKey = (item: CartItem, index: number) => {
    if (item.type === "powdercoat" && item.powdercoatService) {
      return `powdercoat-${item.powdercoatService.id}-${item.amount}-${index}`;
    } else if (item.sticker) {
      return `${item.sticker.id}-${item.width}-${item.height}-${item.vinyl}-${item.printed}-${index}`;
    } else {
      return `${item.part?.id}-${item.part?.price}-${item.amount}-${item.part?.translations}-${index}`;
    }
  };

  // Fetch price for a single sticker
  const fetchSingleStickerPrice = async (item: CartItem, index: number) => {
    if (!item.sticker) {
      return;
    }
    const itemKey = getItemKey(item, index);

    // Mark item as loading
    setItemPrices((prev) => ({
      ...prev,
      [itemKey]: { price: 0, loading: true, error: false },
    }));

    try {
      // Build query params
      const params = new URLSearchParams();

      // For fixed price stickers, still send basic parameters as backend expects them
      if (item.sticker.generalPrice) {
        // Add stickerId for standard stickers (not custom stickers)
        if ("translations" in item.sticker) {
          params.append("stickerId", item.sticker.id);
        }
        // Send width, height, vinyl, printed even for fixed price stickers
        params.append("width", (item.width || 10).toString());
        params.append("height", (item.height || 10).toString());
        params.append("vinyl", (item.vinyl || true).toString());
        params.append("printed", (item.printed || false).toString());
      } else {
        // For per cm² pricing, send all parameters
        params.append("width", item.width!.toString());
        params.append("height", item.height!.toString());
        params.append("vinyl", item.vinyl!.toString());
        params.append("printed", item.printed!.toString());

        // Add stickerId for standard stickers (not custom stickers)
        if ("translations" in item.sticker) {
          params.append("stickerId", item.sticker.id);
        }
      }

      const response = await axiosInstance.get<{ price: number }>(
        `/orders/calculate-single-price?${params.toString()}`,
      );

      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: response.data.price, loading: false, error: false },
      }));
    } catch (error) {
      console.error(`Error fetching price for item ${index}:`, error);
      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: 0, loading: false, error: true },
      }));
    }
  };

  const fetchSinglePartPrice = async (
    item: CartItem,
    index: number,
    customizationOptions: CustomizationOptions,
  ) => {
    if (!item.part) {
      return;
    }
    const itemKey = getItemKey(item, index);
    // Build a flat array with direct price adjustments so the backend can use them without schema lookup
    const optionsArray = (customizationOptions?.options ?? []).map((option) => {
      const baseOpt: Record<string, unknown> = {
        type: option.type,
        value:
          "selectedValue" in option
            ? String((option as { selectedValue?: unknown }).selectedValue ?? "")
            : "value" in option
              ? String((option as { value?: unknown }).value ?? "")
              : "",
        optionId: option.translations.en.title,
      };
      if ("priceAdjustment" in option && option.priceAdjustment) {
        baseOpt.priceAdjustment = option.priceAdjustment;
      }
      if (
        option.type === "dropdown" &&
        "selectedValue" in option &&
        (option as { selectedValue?: unknown }).selectedValue
      ) {
        const selectedItem = (
          option as { items?: Array<{ id: string; priceAdjustment?: number }> }
        ).items?.find(
          (i) =>
            i.id ===
            String((option as { selectedValue?: unknown }).selectedValue),
        );
        if (selectedItem?.priceAdjustment) {
          baseOpt.selectedItemPriceAdjustment = selectedItem.priceAdjustment;
        }
      }
      return baseOpt;
    });
    const customizationOptionsString = JSON.stringify(optionsArray);
    const params = new URLSearchParams();
    params.append("partId", item.part.id);
    params.append("customizationOptions", customizationOptionsString);
    params.append("quantity", item.amount.toString());

    // Mark item as loading
    setItemPrices((prev) => ({
      ...prev,
      [itemKey]: { price: 0, loading: true, error: false },
    }));
    try {
      const response = await axiosInstance.get<{ price: number }>(
        `/orders/calculate-single-price?${params.toString()}`,
      );
      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: response.data.price, loading: false, error: false },
      }));
    } catch (error) {
      console.error(`Error fetching price for item ${index}:`, error);
      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: 0, loading: false, error: true },
      }));
    }
  };

  const fetchSinglePowdercoatPrice = async (item: CartItem, index: number) => {
    if (!item.powdercoatService) {
      return;
    }
    const itemKey = getItemKey(item, index);

    // Mark item as loading
    setItemPrices((prev) => ({
      ...prev,
      [itemKey]: { price: 0, loading: true, error: false },
    }));

    try {
      // For powdercoat services, price is directly from the service
      const servicePrice = Number(item.powdercoatService.price) || 0;

      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: servicePrice, loading: false, error: false },
      }));
    } catch (error) {
      console.error(
        `Error fetching price for powdercoat item ${index}:`,
        error,
      );
      setItemPrices((prev) => ({
        ...prev,
        [itemKey]: { price: 0, loading: false, error: true },
      }));
    }
  };

  // Fetch prices for all items
  useEffect(() => {
    items.forEach((item, index) => {
      if (item.type === "part" && item.part) {
        // Fetch part price
        fetchSinglePartPrice(item, index, item.customizationOptions);
      } else if (item.type === "powdercoat" && item.powdercoatService) {
        // Fetch powdercoat service price
        fetchSinglePowdercoatPrice(item, index);
      } else if (item.sticker) {
        // Fetch sticker price
        fetchSingleStickerPrice(item, index);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-fetch when these properties change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    items
      .map((item) =>
        item.type === "powdercoat" && item.powdercoatService
          ? `powdercoat-${item.powdercoatService.id}-${item.amount}-${item.powdercoatService.price}`
          : item.sticker
            ? `${item.sticker.id}-${item.amount}-${item.width}-${item.height}-${item.vinyl}-${item.printed}`
            : `${item.part?.id}-${item.part?.price}-${item.amount}-${item.part?.translations}`,
      )
      .join(","),
  ]);

  const calculateItemPrice = (item: CartItem) => {
    // Handle powdercoat service items
    if (item.type === "powdercoat" && item.powdercoatService) {
      return Number(item.powdercoatService.price) || 0;
    }

    // Handle part items
    if (item.type === "part" && item.part) {
      let basePrice = parseFloat(item.part.price || "0");

      if (item.customizationOptions?.options?.length) {
        // Use the part's full schema as the source of truth for price adjustments
        const rawSchema = item.part.customizationOptions;
        let partSchema: PartSchema | null = null;
        try {
          partSchema = typeof rawSchema === "string" ? JSON.parse(rawSchema) : (rawSchema as PartSchema | null);
        } catch { partSchema = null; }
        const schemaOptions: PartSchemaOption[] = partSchema?.options || [];

        item.customizationOptions.options.forEach((option) => {
          // Find matching option in part schema by type + English title
          const schemaOpt = schemaOptions.find(
            (so) =>
              so.type === option.type &&
              so.translations?.en?.title === option.translations?.en?.title,
          );

          // Option-level price adjustment (prefer schema value, fallback to stored)
          const runtimeOpt = option as RuntimeOption;
          const optAdj =
            schemaOpt?.priceAdjustment ??
            runtimeOpt.priceAdjustment ??
            0;
          if (optAdj) basePrice += optAdj;

          // For dropdown: find the selected item's price adjustment
          if (option.type === "dropdown") {
            const selectedVal = runtimeOpt.selectedValue ?? runtimeOpt.value ?? null;
            if (selectedVal) {
              // Try schema items first, then stored items
              const itemsList: PartSchemaItem[] =
                schemaOpt?.items || runtimeOpt.items || [];
              const selItem = itemsList.find((i) => i.id === selectedVal);
              if (selItem?.priceAdjustment) basePrice += selItem.priceAdjustment;
            }
          }
        });
      }

      return basePrice;
    }

    // Handle sticker items
    // Check for fixed price first
    if (item.sticker?.generalPrice) {
      return parseFloat(item.sticker.generalPrice);
    }

    // Handle per cm² pricing
    let pricePerCm2 = 0;
    let additionalPrice = 0;

    if (item.vinyl) {
      pricePerCm2 = parseFloat(
        typeof item.sticker!.pricePerCm2Vinyl === "string"
          ? item.sticker!.pricePerCm2Vinyl
          : "0",
      );
      additionalPrice = priceSettings.additionalPriceVinyl;
    } else if (item.printed) {
      pricePerCm2 = parseFloat(
        typeof item.sticker!.pricePerCm2Printable === "string"
          ? item.sticker!.pricePerCm2Printable
          : "0",
      );
      additionalPrice = priceSettings.additionalPricePrintable;
    }

    // Calculate area and base price
    const area = item.width! * item.height!;
    const basePrice = pricePerCm2 * area + additionalPrice;

    return basePrice;
  };

  // Function to calculate prices via API
  // Function to calculate prices via API
  const calculatePrices = async () => {
    if (items.length === 0) {
      setPriceCalculation(null);
      return;
    }

    try {
      setIsCalculating(true);
      setCalculationError("");

      // Separate stickers, parts, and powdercoat services into their respective arrays
      const stickerItems = [];
      const partItems = [];
      const powdercoatItems = [];

      // Process each item in the cart
      for (const item of items) {
        if (item.type === "powdercoat" && item.powdercoatService) {
          // Powdercoat service items go to powdercoatServiceOrderItems array
          powdercoatItems.push({
            powdercoatingServiceId: item.powdercoatService.id,
            quantity: item.amount,
            color: item.powdercoatColorId || item.color || "", // Always include color field
          });
        } else if (item.type === "part" && item.part) {
          // Parse the part schema for reliable priceAdjustment lookups
          const rawSchema = item.part.customizationOptions;
          let partSchema: PartSchema | null = null;
          try {
            partSchema = typeof rawSchema === "string" ? JSON.parse(rawSchema) : (rawSchema as PartSchema | null);
          } catch { /* ignore */ }

          // Part items go to partOrderItems array
          partItems.push({
            partId: item.part.id,
            quantity: item.amount,
            customizationOptions:
              item.customizationOptions?.options?.map((option) => {
                const schemaOptions: PartSchemaOption[] = partSchema?.options || [];
                const schemaOpt = schemaOptions.find(
                  (so) =>
                    so.type === option.type &&
                    so.translations?.en?.title === option.translations?.en?.title,
                );

                const runtimeOpt = option as RuntimeOption;
                const baseOption: OrderedItemCustomizationOption = {
                  type: option.type,
                  value: String(runtimeOpt.selectedValue ?? runtimeOpt.value ?? ""),
                  optionId: option.translations.en.title,
                };

                // Option-level price adjustment (prefer schema)
                const optAdj = schemaOpt?.priceAdjustment ?? runtimeOpt.priceAdjustment;
                if (optAdj != null && optAdj !== 0) {
                  baseOption.priceAdjustment = optAdj;
                }

                // For dropdown: selected item price adjustment (prefer schema)
                if (option.type === "dropdown") {
                  const selectedVal = runtimeOpt.selectedValue ?? runtimeOpt.value ?? null;
                  if (selectedVal) {
                    const itemsList: PartSchemaItem[] = schemaOpt?.items || runtimeOpt.items || [];
                    const selItem = itemsList.find((i) => i.id === selectedVal);
                    if (selItem?.priceAdjustment) {
                      baseOption.selectedItemPriceAdjustment = selItem.priceAdjustment;
                    }
                  }
                }

                return baseOption;
              }) || [],
          });
        } else if (item.sticker) {
          // Sticker items go to orderItems array
          const stickerOrderItem: {
            stickerId: string;
            quantity: number;
            width?: number;
            height?: number;
            vinyl?: boolean;
            printed?: boolean;
            customizationOptions: Array<{
              optionId: string;
              selectedItemId?: string;
              selectedItemPriceAdjustment?: number;
              type?: string;
              value?: string;
            }>;
          } = {
            stickerId: item.sticker.id,
            quantity: item.amount,
            customizationOptions:
              item.customizationOptions?.options?.map((option) => {
                const baseOption: {
                  optionId: string;
                  selectedItemId?: string;
                  selectedItemPriceAdjustment?: number;
                  type?: string;
                  value?: string;
                } = {
                  optionId: option.translations.en.title,
                  type: option.type,
                };

                // For dropdown options, use selectedItemId format
                if (option.type === "dropdown" && "selectedValue" in option) {
                  baseOption.selectedItemId = String(
                    option.selectedValue || "",
                  );

                  // Find the selected item to get price adjustment
                  if ("items" in option && option.items) {
                    const selectedItem = option.items.find(
                      (item) => item.id === option.selectedValue,
                    );
                    if (selectedItem && selectedItem.priceAdjustment) {
                      baseOption.selectedItemPriceAdjustment =
                        selectedItem.priceAdjustment;
                    }
                  }
                } else {
                  // For other option types, use value format
                  baseOption.value =
                    "selectedValue" in option
                      ? String(option.selectedValue || "")
                      : "value" in option
                        ? String(option.value || "")
                        : "";
                }

                return baseOption;
              }) || [],
          };

          // Only add dimensions and type for per cm² pricing
          if (
            !item.sticker.generalPrice ||
            Number(item.sticker.generalPrice) <= 0
          ) {
            stickerOrderItem.width = item.width;
            stickerOrderItem.height = item.height;
            stickerOrderItem.vinyl = item.vinyl;
            stickerOrderItem.printed = item.printed;
          } else {
            // For fixed price stickers, still send dimensions and type as backend expects them
            stickerOrderItem.width = item.width || 10;
            stickerOrderItem.height = item.height || 10;
            stickerOrderItem.vinyl =
              item.vinyl !== undefined ? item.vinyl : false;
            stickerOrderItem.printed =
              item.printed !== undefined ? item.printed : false;
          }

          stickerItems.push(stickerOrderItem);
        }
      }

      // Create request payload with separate arrays for stickers, parts, and powdercoat services
      const requestData = {
        orderItems: stickerItems,
        partOrderItems: partItems,
        powdercoatServiceOrderItems: powdercoatItems, // Updated property name
        discountCode: undefined,
        shippingAddress: {
          country: "CH", // Default to Switzerland for cart page pricing
          city: "",
          zipCode: "",
          street: "",
        },
      };

      const response = await axiosInstance.post<PriceCalculationResponse>(
        "/orders/calculate-price",
        requestData,
      );

      setPriceCalculation(response.data);
    } catch (error) {
      console.error("Error calculating prices:", error);
      setCalculationError(t("calculationError"));
    } finally {
      setIsCalculating(false);
    }
  };

  // Call the API when items or discount code changes
  useEffect(() => {
    calculatePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleQuantityChange = (item: CartItem, newAmount: number) => {
    if (newAmount < 1) return;

    if (item.type === "powdercoat" && item.powdercoatService) {
      updatePowdercoatServiceQuantity(item.powdercoatService.id, newAmount);
    } else if (item.type === "part" && item.part) {
      updateQuantity(item.part, newAmount, "part");
    } else if (item.sticker) {
      updateQuantity(item.sticker, newAmount, "sticker");
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    if (item.type === "powdercoat" && item.powdercoatService) {
      removePowdercoatService(
        item.powdercoatService.id,
        item.customizationOptions,
      );
    } else if (item.type === "part" && item.part) {
      removeItem(
        item.part,
        item.customizationOptions,
        undefined,
        undefined,
        "part",
      );
    } else if (item.sticker) {
      removeItem(
        item.sticker,
        item.customizationOptions,
        item.width,
        item.height,
        "sticker",
      );
    }
  };

  // Function to determine which shipping label to show based on cart contents
  const getShippingLabel = () => {
    const hasPowdercoatService = items.some(
      (item) => item.type === "powdercoat" && item.powdercoatService,
    );
    const hasOtherItems = items.some((item) => item.type !== "powdercoat");

    if (hasPowdercoatService && hasOtherItems) {
      return t("returnShippingAndShipping");
    } else if (hasPowdercoatService) {
      return t("returnShipping");
    } else {
      return t("shipping");
    }
  };

  if (items.length === 0) {
    return (
      <div className={`flex w-full min-h-[80vh] items-center justify-center bg-zinc-950 py-24 md:py-48 ${oswald.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-body)" }}>
        <div className="flex max-w-md w-full flex-col items-center gap-6 border border-zinc-800 bg-zinc-900 p-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center border border-zinc-700">
            <svg className="h-10 w-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
              {t("title")}
            </h2>
            <p className="mt-2 text-zinc-400">{t("emptyCart")}</p>
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 bg-amber-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-zinc-950 transition-all hover:bg-amber-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-[80vh] bg-zinc-950 px-4 py-12 md:py-16 ${oswald.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full">
        {/* Page heading */}
        <div className="mb-10 border-b border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
            — {t("title")}
          </p>
          <h1 className="mt-1 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            {t("title")}
          </h1>
        </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:w-2/3">
          {/* Pre-order notice banner */}
          {items.some(
            (item) =>
              item.type === "part" &&
              item.part &&
              (Array.isArray(item.part.shippingReady)
                ? item.part.shippingReady[0]
                : item.part.shippingReady) === "pre_order",
          ) && (
            <div className="mb-4 flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
                />
              </svg>
              <span>{t("preOrderNotice")}</span>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-hidden border border-zinc-800">
              <table className="w-full">
                <thead className="border-b border-zinc-700 bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                      {t("product")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                      {t("details")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                      {t("quantity")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
                      {t("price")}
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(isCartExpanded ? items : items.slice(0, 3)).map(
                    (item, index) => {
                      const itemKey = getItemKey(item, index);
                      const itemPrice = itemPrices[itemKey] || {
                        price: 0,
                        loading: true,
                        error: false,
                      };

                      return (
                        <tr key={index} className="bg-zinc-900 transition-colors hover:bg-zinc-800/50">
                          <td className="px-4 py-4">
                            <div className="w-20 h-20 relative overflow-hidden border border-zinc-700">
                              {/* Check if it's a part */}
                              {item.type === "part" && item.part ? (
                                <Link
                                  href={`/${locale}/part/${
                                    item.partId || item.part.id
                                  }`}
                                  className="block w-full h-full"
                                >
                                  <div className="w-full h-full relative cursor-pointer hover:opacity-80 transition-opacity">
                                    {item.part.images &&
                                    item.part.images.length > 0 ? (
                                      <Image
                                        src={
                                          item.part.images[0].startsWith("http")
                                            ? item.part.images[0]
                                            : `https://minio-api.cwx-dev.com/parts/${item.part.images[0]}`
                                        }
                                        alt={
                                          "translations" in item.part &&
                                          item.part.translations.length > 0
                                            ? item.part.translations[0].title
                                            : "Part"
                                        }
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                        priority={index < 2}
                                        unoptimized={true}
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src = "/512x512.png";
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                        <span className="text-zinc-500 text-xs">No Image</span>
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ) : /* Check if it's a powdercoat service */
                              item.type === "powdercoat" &&
                                item.powdercoatService ? (
                                <Link
                                  href={`/${locale}/powdercoat/${item.powdercoatService.id}`}
                                  className="block w-full h-full"
                                >
                                  <div className="w-full h-full relative cursor-pointer hover:opacity-80 transition-opacity">
                                    {item.powdercoatService.images &&
                                    item.powdercoatService.images.length > 0 ? (
                                      <Image
                                        src={item.powdercoatService.images[0]}
                                        alt={item.powdercoatService.name}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                        priority={index < 2}
                                        unoptimized={true}
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src = "/512x512.png";
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                        <span className="text-zinc-500 text-xs">No Image</span>
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ) : /* Check if it's a custom sticker with direct image data */
                              item.sticker &&
                                !("images" in item.sticker) &&
                                "image" in item.sticker ? (
                                <div className="relative w-20 h-20 bg-transparent flex items-center justify-center">
                                  <div className="w-18 h-18 overflow-hidden relative flex items-center justify-center bg-transparent">
                                    <Image
                                      src={
                                        item.sticker.image.startsWith("http")
                                          ? item.sticker.image
                                          : item.sticker.image
                                      }
                                      alt="Custom Sticker"
                                      fill
                                      className="object-contain"
                                      unoptimized={true}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = "/512x512.png";
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : item.sticker &&
                                "images" in item.sticker &&
                                item.sticker.images?.length > 0 ? (
                                <Link
                                  href={`/${locale}/sticker/${item.sticker.id}`}
                                  className="block w-full h-full"
                                >
                                  <div className="w-full h-full relative cursor-pointer hover:opacity-80 transition-opacity">
                                    <Image
                                      src={
                                        item.sticker.images[0].startsWith(
                                          "http",
                                        )
                                          ? item.sticker.images[0]
                                          : `https://minio-api.cwx-dev.com/stickers/${item.sticker.images[0]}`
                                      }
                                      alt={
                                        "translations" in item.sticker &&
                                        item.sticker.translations.length > 0
                                          ? item.sticker.translations[0].title
                                          : "Sticker"
                                      }
                                      fill
                                      className="object-cover"
                                      sizes="80px"
                                      priority={index < 2}
                                      unoptimized={true}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = "/512x512.png";
                                      }}
                                    />
                                  </div>
                                </Link>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                  <span className="text-zinc-500 text-xs">No Image</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {/* Item details */}
                            {item.type === "powdercoat" &&
                            item.powdercoatService ? (
                              // Powdercoat service details
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-sm">
                                    {item.powdercoatService.name}
                                  </span>
                                  <span className="inline-block text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 px-2 py-0.5" style={{ fontFamily: "var(--font-display)" }}>
                                    {t("powdercoatBadge")}
                                  </span>
                                </div>

                                {item.powdercoatColor && (
                                  <p className="text-sm text-zinc-400">
                                    Color: {item.powdercoatColor.color}
                                  </p>
                                )}

                                {item.customizationOptions?.options?.length >
                                  0 && (
                                  <div className="mt-1 space-y-1">
                                    {item.customizationOptions.options
                                      .map((option, idx) => {
                                        const optionTitle =
                                          option.translations?.en?.title ||
                                          "Option";
                                        const displayValue =
                                          option.type === "dropdown"
                                            ? getDropdownLabel(
                                                item,
                                                option,
                                                locale as
                                                  | "de"
                                                  | "en"
                                                  | "fr"
                                                  | "it",
                                              )
                                            : option.type === "filamentColor"
                                              ? getFilamentColorLabel(option)
                                              : "selectedValue" in option
                                                ? option.selectedValue
                                                : "value" in option
                                                  ? option.value
                                                  : "";

                                        if (!displayValue) return null;

                                        return (
                                          <p key={idx} className="text-sm text-zinc-400 flex items-center gap-2">
                                            {String(optionTitle)}:{" "}
                                            {option.type === "color" && (
                                              <span
                                                className="inline-block w-4 h-4 border border-zinc-600"
                                                style={{
                                                  backgroundColor:
                                                    String(displayValue),
                                                }}
                                                title={String(displayValue)}
                                              />
                                            )}
                                            {String(displayValue)}
                                          </p>
                                        );
                                      })
                                      .filter(Boolean)}
                                  </div>
                                )}
                              </div>
                            ) : item.type === "part" && item.part ? (
                              // Part details
                              <div className="space-y-1.5">
                                <div className="font-semibold text-white text-sm">
                                  {item.part.translations.find(
                                    (t: { language: string }) =>
                                      t.language === locale,
                                  )?.title ||
                                    item.part.translations[0]?.title ||
                                    "Part"}
                                </div>

                                {/* Pre-order badge */}
                                {(Array.isArray(item.part.shippingReady)
                                  ? item.part.shippingReady[0]
                                  : item.part.shippingReady) ===
                                  "pre_order" && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-block text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 px-2 py-0.5" style={{ fontFamily: "var(--font-display)" }}>
                                      {t("preOrderBadge")}
                                    </span>
                                    {item.part.shippingDate && (
                                      <span className="text-xs text-zinc-400">
                                        {t("preOrderShipsOn")}{" "}
                                        {new Date(
                                          item.part.shippingDate,
                                        ).toLocaleDateString(
                                          typeof locale === "string"
                                            ? locale
                                            : "en",
                                          {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          },
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Discount info */}
                                {item.part.initialPrice &&
                                  parseFloat(item.part.initialPrice) >
                                    parseFloat(item.part.price) && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-amber-400 font-bold">
                                        CHF{" "}
                                        {calculateItemPrice(item).toFixed(2)}
                                      </span>
                                      <span className="text-sm text-zinc-500 line-through">
                                        CHF{" "}
                                        {parseFloat(
                                          item.part.initialPrice,
                                        ).toFixed(2)}
                                      </span>
                                      <span className="text-xs border border-red-500/40 bg-red-500/10 text-red-400 px-2 py-0.5 font-bold" style={{ fontFamily: "var(--font-display)" }}>
                                        {Math.round(
                                          ((parseFloat(item.part.initialPrice) -
                                            parseFloat(item.part.price)) /
                                            parseFloat(
                                              item.part.initialPrice,
                                            )) *
                                            100,
                                        )}
                                        % OFF
                                      </span>
                                    </div>
                                  )}

                                {item.customizationOptions?.options?.length >
                                  0 && (
                                  <div className="mt-1 space-y-1">
                                    {item.customizationOptions.options.map(
                                      (option, idx) => {
                                        const rawValue = String(
                                          "selectedValue" in option
                                            ? option.selectedValue || ""
                                            : "value" in option
                                              ? option.value || ""
                                              : "",
                                        );

                                        if (!rawValue) return null;

                                        const optionTitle =
                                          option.translations?.[
                                            locale as "en" | "de" | "fr" | "it"
                                          ]?.title ||
                                          option.translations?.en?.title ||
                                          "";

                                        console.log("=== Processing option ===");
                                        console.log("Option:", option);
                                        console.log("Raw value (ID):", rawValue);
                                        console.log("Option title:", optionTitle);

                                        let displayValue: React.ReactNode = rawValue;
                                        let displayTitle = optionTitle || "Option";

                                        if (option.type === "filamentColor") {
                                          displayValue = getFilamentColorLabel(option);
                                        }

                                        if (
                                          option.type === "dropdown" &&
                                          item.part?.customizationOptions
                                        ) {
                                          try {
                                            const partCustomizationOptions =
                                              typeof item.part
                                                .customizationOptions ===
                                              "string"
                                                ? JSON.parse(
                                                    item.part
                                                      .customizationOptions,
                                                  )
                                                : item.part
                                                    .customizationOptions;

                                            const partOptions =
                                              partCustomizationOptions?.options ||
                                              [];

                                            console.log("Part options:", partOptions);

                                            const matchingDropdown =
                                              partOptions.find(
                                                (
                                                  partOption: CustomizationOption,
                                                ) => {
                                                  if (
                                                    partOption.type !==
                                                    "dropdown"
                                                  )
                                                    return false;

                                                  const partTitles = [
                                                    partOption.translations?.en
                                                      ?.title,
                                                    partOption.translations?.de
                                                      ?.title,
                                                    partOption.translations?.fr
                                                      ?.title,
                                                    partOption.translations?.it
                                                      ?.title,
                                                  ].filter(Boolean);

                                                  console.log("Comparing:", partTitles, "with", optionTitle);

                                                  return partTitles.some(
                                                    (title) =>
                                                      title?.toLowerCase() ===
                                                      optionTitle?.toLowerCase(),
                                                  );
                                                },
                                              );

                                            console.log("Matching dropdown:", matchingDropdown);

                                            if (!matchingDropdown) {
                                              const fallbackDropdown =
                                                partOptions.find(
                                                  (
                                                    partOption: CustomizationOption,
                                                  ) =>
                                                    partOption.type ===
                                                    "dropdown",
                                                ) as DropdownOption | undefined;

                                              console.log("Using fallback dropdown:", fallbackDropdown);

                                              if (fallbackDropdown?.items) {
                                                displayTitle =
                                                  fallbackDropdown
                                                    .translations?.[
                                                    locale as
                                                      | "en"
                                                      | "de"
                                                      | "fr"
                                                      | "it"
                                                  ]?.title ||
                                                  fallbackDropdown.translations
                                                    ?.en?.title ||
                                                  optionTitle;

                                                console.log("Looking for item with ID:", rawValue);
                                                console.log("Available items:", fallbackDropdown.items);

                                                const selectedItem =
                                                  fallbackDropdown.items.find(
                                                    (item) => {
                                                      console.log("Checking item ID:", item.id, "against:", rawValue);
                                                      return (
                                                        String(
                                                          item.id,
                                                        ).trim() ===
                                                        String(rawValue).trim()
                                                      );
                                                    },
                                                  );

                                                console.log("Selected item:", selectedItem);

                                                if (
                                                  selectedItem?.translations
                                                ) {
                                                  displayValue =
                                                    selectedItem.translations[
                                                      locale as
                                                        | "en"
                                                        | "de"
                                                        | "fr"
                                                        | "it"
                                                    ]?.title ||
                                                    selectedItem.translations.en
                                                      ?.title ||
                                                    rawValue;
                                                  console.log("Display value:", displayValue);
                                                }
                                              }
                                            } else if (
                                              matchingDropdown?.items
                                            ) {
                                              displayTitle =
                                                matchingDropdown.translations?.[
                                                  locale as
                                                    | "en"
                                                    | "de"
                                                    | "fr"
                                                    | "it"
                                                ]?.title ||
                                                matchingDropdown.translations
                                                  ?.en?.title ||
                                                optionTitle;

                                              console.log("Looking for item with ID:", rawValue);
                                              console.log("Available items:", matchingDropdown.items);

                                              const selectedItem = (
                                                matchingDropdown as DropdownOption
                                              ).items.find((item) => {
                                                console.log("Checking item ID:", item.id, "against:", rawValue);
                                                return (
                                                  String(item.id).trim() ===
                                                  String(rawValue).trim()
                                                );
                                              });

                                              console.log("Selected item:", selectedItem);

                                              if (selectedItem?.translations) {
                                                displayValue =
                                                  selectedItem.translations[
                                                    locale as
                                                      | "en"
                                                      | "de"
                                                      | "fr"
                                                      | "it"
                                                  ]?.title ||
                                                  selectedItem.translations.en
                                                    ?.title ||
                                                  rawValue;
                                                console.log("Display value:", displayValue);
                                              }
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Error resolving dropdown:",
                                              error,
                                            );
                                          }
                                        }

                                        return (
                                          <p key={idx} className="text-sm text-zinc-400 flex items-center gap-2">
                                            {displayTitle}:
                                            {option.type === "color" && (
                                              <span
                                                className="inline-block w-4 h-4 border border-zinc-600"
                                                style={{
                                                  backgroundColor:
                                                    String(displayValue),
                                                }}
                                                title={String(displayValue)}
                                              />
                                            )}
                                            {displayValue}
                                          </p>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Sticker details
                              <div className="space-y-1.5">
                                <div className="font-semibold text-white text-sm">
                                  {item.sticker &&
                                  "translations" in item.sticker &&
                                  Array.isArray(item.sticker.translations)
                                    ? item.sticker.translations.find(
                                        (t) => t.language === locale,
                                      )?.title ||
                                      item.sticker.translations[0]?.title ||
                                      "Sticker"
                                    : "Custom Sticker"}
                                </div>
                                {!item.sticker?.generalPrice && (
                                  <p className="text-sm text-zinc-400">
                                    {item.width?.toFixed(2)}cm ×{" "}
                                    {item.height?.toFixed(2)}cm
                                  </p>
                                )}
                                {!item.sticker?.generalPrice && (
                                  <p className="text-sm text-zinc-400">
                                    {item.vinyl ? t("vinyl") : t("printable")}
                                  </p>
                                )}
                                {item.sticker?.generalPrice && (
                                  <p className="text-sm text-zinc-400">
                                    Fixed price: CHF {item.sticker.generalPrice}
                                  </p>
                                )}
                                {item.customizationOptions?.options?.length >
                                  0 && (
                                  <div className="mt-1 space-y-1">
                                    {item.customizationOptions.options
                                      .map((option, idx) => {
                                        const optionTitle =
                                          typeof option.translations ===
                                            "object" &&
                                          (
                                            option.translations as Record<
                                              string,
                                              { title: string }
                                            >
                                          )[locale as string]?.title
                                            ? (
                                                option.translations as Record<
                                                  string,
                                                  { title: string }
                                                >
                                              )[locale as string]?.title
                                            : (
                                                option.translations as BaseCustomizationOption["translations"]
                                              ).en.title;

                                        const displayValue =
                                          option.type === "dropdown"
                                            ? getDropdownLabel(
                                                item,
                                                option,
                                                locale as
                                                  | "de"
                                                  | "en"
                                                  | "fr"
                                                  | "it",
                                              )
                                            : option.type === "filamentColor"
                                              ? getFilamentColorLabel(option)
                                              : "selectedValue" in option
                                                ? String(
                                                    option.selectedValue || "",
                                                  )
                                                : "value" in option
                                                  ? String(option.value || "")
                                                  : "";

                                        if (!displayValue.trim()) return null;

                                        return (
                                          <p
                                            key={idx}
                                            className="text-sm text-zinc-400 flex items-center gap-2"
                                          >
                                            {String(optionTitle)}:{" "}
                                            {option.type === "color" && (
                                              <span
                                                className="inline-block w-4 h-4 border border-zinc-600"
                                                style={{
                                                  backgroundColor: displayValue,
                                                }}
                                                title={displayValue}
                                              />
                                            )}
                                            {displayValue}
                                          </p>
                                        );
                                      })
                                      .filter(Boolean)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.amount}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-16 border border-zinc-700 bg-zinc-800 py-1.5 text-center text-sm text-white focus:border-amber-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div>
                              {itemPrice.loading ? (
                                <div className="flex justify-end">
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
                                </div>
                              ) : itemPrice.error ? (
                                <span className="text-red-400 text-sm font-medium">
                                  {t("priceError")}
                                </span>
                              ) : (
                                <>
                                  <div className="text-xs text-zinc-500">
                                    CHF {calculateItemPrice(item).toFixed(2)} ×{" "}
                                    {item.amount}
                                  </div>
                                  <div className="mt-0.5 font-bold text-white">
                                    CHF{" "}
                                    {(
                                      calculateItemPrice(item) * item.amount
                                    ).toFixed(2)}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="text-zinc-500 transition-colors hover:text-red-400 p-1"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* Show more/less button for desktop table */}
            {items.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsCartExpanded(!isCartExpanded)}
                  className="flex items-center gap-2 mx-auto border border-zinc-700 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-amber-500 hover:text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {isCartExpanded ? (
                    <>
                      {t("showLess")} ({items.length - 3} {t("itemsHidden")})
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </>
                  ) : (
                    <>
                      {t("showMore")} ({items.length - 3} {t("moreItems")})
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {(isCartExpanded ? items : items.slice(0, 3)).map((item, index) => {
              const itemKey = getItemKey(item, index);
              const itemPrice = itemPrices[itemKey] || {
                price: 0,
                loading: true,
                error: false,
              };

              return (
                <div
                  key={index}
                  className="border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:bg-zinc-800/50"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden border border-zinc-700">
                      {/* Check if it's a part */}
                      {item.type === "part" && item.part ? (
                        <Link
                          href={`/${locale}/part/${
                            item.partId || item.part.id
                          }`}
                          className="block w-full h-full"
                        >
                          <div className="w-full h-full relative cursor-pointer hover:opacity-80 transition-opacity overflow-hidden">
                            {item.part.images && item.part.images.length > 0 ? (
                              <Image
                                src={
                                  item.part.images[0].startsWith("http")
                                    ? item.part.images[0]
                                    : `https://minio-api.cwx-dev.com/parts/${item.part.images[0]}`
                                }
                                alt={
                                  "translations" in item.part &&
                                  item.part.translations.length > 0
                                    ? item.part.translations[0].title
                                    : "Part"
                                }
                                fill
                                className="object-cover"
                                sizes="80px"
                                priority={index < 2}
                                unoptimized={true}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/512x512.png";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <span className="text-zinc-500 text-xs">
                                  No Image
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : /* Check if it's a custom sticker with direct image data */
                      item.sticker &&
                        !("images" in item.sticker) &&
                        "image" in item.sticker ? (
                        <div className="relative w-20 h-20 bg-transparent flex items-center justify-center overflow-hidden">
                          <div className="w-18 h-18 overflow-hidden relative flex items-center justify-center bg-transparent">
                            <Image
                              src={
                                item.sticker.image.startsWith("http")
                                  ? item.sticker.image
                                  : item.sticker.image
                              }
                              alt="Custom Sticker"
                              fill
                              className="object-contain"
                              unoptimized={true}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/512x512.png";
                              }}
                            />
                          </div>
                        </div>
                      ) : item.sticker &&
                        "images" in item.sticker &&
                        item.sticker.images?.length > 0 ? (
                        <Link
                          href={`/${locale}/sticker/${item.sticker.id}`}
                          className="block w-full h-full"
                        >
                          <div className="w-full h-full relative cursor-pointer hover:opacity-80 transition-opacity overflow-hidden">
                            <Image
                              src={
                                item.sticker.images[0].startsWith("http")
                                  ? item.sticker.images[0]
                                  : `https://minio-api.cwx-dev.com/stickers/${item.sticker.images[0]}`
                              }
                              alt={
                                "translations" in item.sticker &&
                                item.sticker.translations.length > 0
                                  ? item.sticker.translations[0].title
                                  : "Sticker"
                              }
                              fill
                              className="object-cover"
                              sizes="80px"
                              priority={index < 2}
                              unoptimized={true}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/512x512.png";
                              }}
                            />
                          </div>
                        </Link>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 rounded-md">
                          <span className="text-zinc-500 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      {/* Item details */}
                      {item.type === "powdercoat" && item.powdercoatService ? (
                        // Powdercoat service details (no description shown)
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white truncate text-sm">
                              {item.powdercoatService.name}
                            </h3>
                            <span className="inline-block text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 px-2 py-0.5" style={{ fontFamily: "var(--font-display)" }}>
                              {t("powdercoatBadge")}
                            </span>
                          </div>

                          {/* Show selected color if any */}
                          {item.powdercoatColor && (
                            <p className="text-sm text-zinc-400 mt-1">
                              Color: {item.powdercoatColor.color}
                            </p>
                          )}

                          {item.customizationOptions?.options?.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.customizationOptions.options
                                .map((option, idx) => {
                                  const optionTitle =
                                    option.translations?.en?.title || "Option";
                                  const displayValue =
                                    option.type === "dropdown"
                                      ? getDropdownLabel(
                                          item,
                                          option,
                                          locale as "de" | "en" | "fr" | "it",
                                        )
                                      : option.type === "filamentColor"
                                        ? getFilamentColorLabel(option)
                                        : "selectedValue" in option
                                          ? option.selectedValue
                                          : "value" in option
                                            ? option.value
                                            : "";

                                  if (!displayValue) return null;

                                  return (
                                    <p
                                      key={idx}
                                      className="text-sm text-zinc-400 flex flex-wrap items-center gap-1 min-w-0"
                                    >
                                      <span className="shrink-0">
                                        {String(optionTitle)}:
                                      </span>
                                      {option.type === "color" && (
                                        <span
                                          className="inline-block w-4 h-4 border border-zinc-600 flex-shrink-0"
                                          style={{
                                            backgroundColor:
                                              String(displayValue),
                                          }}
                                          title={String(displayValue)}
                                        />
                                      )}
                                      <span className="break-all min-w-0">
                                        {String(displayValue)}
                                      </span>
                                    </p>
                                  );
                                })
                                .filter(Boolean)}
                            </div>
                          )}
                        </div>
                      ) : item.type === "part" && item.part ? (
                        // Part details
                        <div>
                          <h3 className="font-semibold text-white text-sm truncate">
                            {item.part.translations.find(
                              (t: { language: string }) =>
                                t.language === locale,
                            )?.title ||
                              item.part.translations[0]?.title ||
                              "Part"}
                          </h3>

                          {/* Pre-order badge */}
                          {(Array.isArray(item.part.shippingReady)
                            ? item.part.shippingReady[0]
                            : item.part.shippingReady) === "pre_order" && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="inline-block text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 px-2 py-0.5" style={{ fontFamily: "var(--font-display)" }}>
                                {t("preOrderBadge")}
                              </span>
                              {item.part.shippingDate && (
                                <span className="text-xs text-zinc-400">
                                  {t("preOrderShipsOn")}{" "}
                                  {new Date(
                                    item.part.shippingDate,
                                  ).toLocaleDateString(
                                    typeof locale === "string" ? locale : "en",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Show discount info if part has initialPrice */}
                          {item.part.initialPrice &&
                            parseFloat(item.part.initialPrice) >
                              parseFloat(item.part.price) && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-amber-400 font-semibold">
                                  CHF {calculateItemPrice(item).toFixed(2)}
                                </span>
                                <span className="text-sm text-zinc-500 line-through">
                                  CHF{" "}
                                  {parseFloat(item.part.initialPrice).toFixed(
                                    2,
                                  )}
                                </span>
                                <span className="text-xs border border-red-500/40 bg-red-500/10 text-red-400 px-1.5 py-0.5 font-bold" style={{ fontFamily: "var(--font-display)" }}>
                                  {Math.round(
                                    ((parseFloat(item.part.initialPrice) -
                                      parseFloat(item.part.price)) /
                                      parseFloat(item.part.initialPrice)) *
                                      100,
                                  )}
                                  % OFF
                                </span>
                              </div>
                            )}

                          {item.customizationOptions?.options?.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.customizationOptions.options.map(
                                (option, idx) => {
                                  // Safely extract option title from translations
                                  const translations = option.translations as
                                    | BaseCustomizationOption["translations"]
                                    | Record<string, { title: string }>;

                                  // Try to get the actual option title from the cart-stored optionId
                                  let optionTitle = "Option";

                                  // First check if we have the title in translations
                                  if (translations?.en?.title) {
                                    optionTitle = translations.en.title;
                                  } else if (translations?.de?.title) {
                                    optionTitle = translations.de.title;
                                  } else if (translations?.fr?.title) {
                                    optionTitle = translations.fr.title;
                                  } else if (translations?.it?.title) {
                                    optionTitle = translations.it.title;
                                  }

                                  // If still "Option", try to get from part data
                                  if (
                                    optionTitle === "Option" &&
                                    item.part?.customizationOptions
                                  ) {
                                    // Parse customizationOptions if it's a string
                                    const partCustomizationOptions =
                                      typeof item.part.customizationOptions ===
                                      "string"
                                        ? JSON.parse(
                                            item.part.customizationOptions,
                                          )
                                        : item.part.customizationOptions;

                                    const partOptions =
                                      partCustomizationOptions?.options || [];

                                    const partDropdown = partOptions.find(
                                      (opt: CustomizationOption) =>
                                        opt.type === "dropdown",
                                    );
                                    if (
                                      partDropdown &&
                                      "translations" in partDropdown
                                    ) {
                                      optionTitle =
                                        partDropdown.translations?.[
                                          locale as "en" | "de" | "fr" | "it"
                                        ]?.title ||
                                        partDropdown.translations?.en?.title ||
                                        "Option";
                                    }
                                  }

                                  const rawValue =
                                    "selectedValue" in option
                                      ? option.selectedValue || ""
                                      : "value" in option
                                        ? option.value || ""
                                        : "";

                                  // Don't show empty values
                                  if (!rawValue) return null;

                                  // For filament color options, resolve the color name
                                  let displayValue = rawValue;
                                  let resolvedTitle = optionTitle;

                                  if (option.type === "filamentColor") {
                                    displayValue =
                                      getFilamentColorLabel(option);
                                  }

                                  // For dropdown options, try to resolve the display value from part data
                                  if (
                                    option.type === "dropdown" &&
                                    item.part?.customizationOptions
                                  ) {
                                    try {
                                      // Parse customizationOptions if it's a string
                                      const partCustomizationOptions =
                                        typeof item.part
                                          .customizationOptions === "string"
                                          ? JSON.parse(
                                              item.part.customizationOptions,
                                            )
                                          : item.part.customizationOptions;

                                      const partOptions =
                                        partCustomizationOptions?.options || [];

                                      // Find the dropdown option definition in part data
                                      // Try case-insensitive match across all translation keys
                                      let dropdownOption = partOptions.find(
                                        (partOption: CustomizationOption) => {
                                          if (partOption.type !== "dropdown")
                                            return false;

                                          // Check all translation keys for a match
                                          const partTitles = [
                                            partOption.translations?.en?.title,
                                            partOption.translations?.de?.title,
                                            partOption.translations?.fr?.title,
                                            partOption.translations?.it?.title,
                                          ].filter(Boolean);

                                          return partTitles.some(
                                            (title) =>
                                              title?.toLowerCase() ===
                                              optionTitle?.toLowerCase(),
                                          );
                                        },
                                      ) as DropdownOption | undefined;

                                      // If still not found, just use the first dropdown option
                                      if (!dropdownOption && partOptions) {
                                        dropdownOption = partOptions.find(
                                          (partOption: CustomizationOption) =>
                                            partOption.type === "dropdown",
                                        ) as DropdownOption | undefined;
                                      }

                                      if (
                                        dropdownOption &&
                                        "items" in dropdownOption &&
                                        dropdownOption.items
                                      ) {
                                        // Update the option title to use the actual title from part data
                                        resolvedTitle =
                                          dropdownOption.translations[
                                            locale as "en" | "de" | "fr" | "it"
                                          ]?.title ||
                                          dropdownOption.translations.en.title;

                                        // Find the selected item by its ID
                                        const selectedItem =
                                          dropdownOption.items.find(
                                            (
                                              dropdownItem: DropdownOption["items"][0],
                                            ) =>
                                              String(dropdownItem.id).trim() ===
                                              String(rawValue).trim(),
                                          );

                                        if (selectedItem?.translations) {
                                          // Use the localized title or fall back to English
                                          displayValue =
                                            selectedItem.translations[
                                              locale as
                                                | "en"
                                                | "de"
                                                | "fr"
                                                | "it"
                                            ]?.title ||
                                            selectedItem.translations.en
                                              ?.title ||
                                            rawValue;
                                        }
                                      }
                                    } catch {
                                      // Keep the raw value as fallback
                                    }
                                  }

                                  return (
                                    <p
                                      key={idx}
                                      className="text-sm text-zinc-400 flex flex-wrap items-center gap-1 min-w-0"
                                    >
                                      <span className="shrink-0">
                                        {String(resolvedTitle)}:
                                      </span>
                                      {option.type === "color" && (
                                        <span
                                          className="inline-block w-4 h-4 border border-zinc-600 flex-shrink-0"
                                          style={{
                                            backgroundColor:
                                              String(displayValue),
                                          }}
                                          title={String(displayValue)}
                                        />
                                      )}
                                      <span className="break-all min-w-0">
                                        {String(displayValue)}
                                      </span>
                                    </p>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Sticker details
                        <div>
                          <h3 className="font-semibold text-white text-sm truncate">
                            {item.sticker &&
                            "translations" in item.sticker &&
                            Array.isArray(item.sticker.translations)
                              ? item.sticker.translations.find(
                                  (t) => t.language === locale,
                                )?.title ||
                                item.sticker.translations[0]?.title ||
                                "Sticker"
                              : "Custom Sticker"}
                          </h3>
                          <p className="text-sm text-zinc-400">
                            {item.width?.toFixed(2)}cm ×{" "}
                            {item.height?.toFixed(2)}cm
                          </p>
                          <p className="text-sm text-zinc-400">
                            {item.vinyl ? t("vinyl") : t("printable")}
                          </p>
                          {item.customizationOptions?.options?.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.customizationOptions.options
                                .map((option, idx) => {
                                  const optionTitle =
                                    typeof option.translations === "object" &&
                                    (
                                      option.translations as Record<
                                        string,
                                        { title: string }
                                      >
                                    )[locale as string]?.title
                                      ? (
                                          option.translations as Record<
                                            string,
                                            { title: string }
                                          >
                                        )[locale as string]?.title
                                      : (
                                          option.translations as BaseCustomizationOption["translations"]
                                        ).en.title;

                                  const displayValue =
                                    option.type === "dropdown"
                                      ? getDropdownLabel(
                                          item,
                                          option,
                                          locale as "de" | "en" | "fr" | "it",
                                        )
                                      : option.type === "filamentColor"
                                        ? getFilamentColorLabel(option)
                                        : "selectedValue" in option
                                          ? String(option.selectedValue || "")
                                          : "value" in option
                                            ? String(option.value || "")
                                            : "";

                                  // Don't show empty values
                                  if (!displayValue.trim()) return null;

                                  return (
                                    <p
                                      key={idx}
                                      className="text-sm text-zinc-400 flex flex-wrap items-center gap-1 min-w-0"
                                    >
                                      <span className="shrink-0">
                                        {String(optionTitle)}:
                                      </span>
                                      {option.type === "color" && (
                                        <span
                                          className="inline-block w-4 h-4 border border-zinc-600 flex-shrink-0"
                                          style={{
                                            backgroundColor: displayValue,
                                          }}
                                          title={displayValue}
                                        />
                                      )}
                                      <span className="break-all min-w-0">
                                        {displayValue}
                                      </span>
                                    </p>
                                  );
                                })
                                .filter(Boolean)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity, Price, and Delete - Mobile Layout */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400">
                        {t("quantity")}:
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={item.amount}
                        onChange={(e) =>
                          handleQuantityChange(
                            item,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-16 border border-zinc-700 bg-zinc-800 py-1.5 text-center text-sm text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Price */}
                      <div className="text-right">
                        {itemPrice.loading ? (
                          <div className="flex justify-end">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
                          </div>
                        ) : itemPrice.error ? (
                          <span className="text-red-400 text-sm font-medium">
                            {t("priceError")}
                          </span>
                        ) : (
                          <div>
                            <div className="text-xs text-zinc-500">
                              CHF {calculateItemPrice(item).toFixed(2)} ×{" "}
                              {item.amount}
                            </div>
                            <div className="font-bold text-white">
                              CHF{" "}
                              {(calculateItemPrice(item) * item.amount).toFixed(
                                2,
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-zinc-500 transition-colors hover:text-red-400 p-1"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show more/less button for mobile cards */}
            {items.length > 3 && (
              <div className="text-center">
                <button
                  onClick={() => setIsCartExpanded(!isCartExpanded)}
                  className="flex items-center gap-2 mx-auto border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-amber-500 hover:text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {isCartExpanded ? (
                    <>
                      {t("showLess")} ({items.length - 3} {t("itemsHidden")})
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </>
                  ) : (
                    <>
                      {t("showMore")} ({items.length - 3} {t("moreItems")})
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-start gap-4">
            <Link
              href={`/${locale}`}
              className="group inline-flex items-center gap-2 border border-zinc-700 px-8 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all duration-300 hover:border-amber-500/60 hover:text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <svg
                className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {t("continueShopping")}
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-1/3 mt-6 lg:mt-0">
          <div className="border border-zinc-800 bg-zinc-900 p-4 md:p-6 sticky top-4">
            <div className="mb-5 border-b border-zinc-800 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
                — summary
              </p>
              <h2 className="mt-1 text-xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                {t("orderSummary")}
              </h2>
            </div>

            {isCalculating ? (
              <div className="flex justify-center items-center py-8 gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
                <span className="text-sm text-zinc-400">{t("calculatingPrice")}</span>
              </div>
            ) : calculationError ? (
              <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                {calculationError}
              </div>
            ) : priceCalculation ? (
              <>
                <div className="space-y-2 border-b border-zinc-800 pb-4 mb-4">
                  {priceCalculation.stickersPrice > 0 && (
                    <div className="flex justify-between text-sm text-zinc-300">
                      <span>{t("stickersSubtotal")}</span>
                      <span className="font-semibold">
                        CHF {priceCalculation.stickersPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {priceCalculation.partsPrice > 0 && (
                    <div className="flex justify-between text-sm text-zinc-300">
                      <span>{t("partsSubtotal")}</span>
                      <span className="font-semibold">
                        CHF {priceCalculation.partsPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {priceCalculation.powdercoatServicesPrice > 0 && (
                    <div className="flex justify-between text-sm text-zinc-300">
                      <span>{t("powdercoatServicesSubtotal")}</span>
                      <span className="font-semibold">
                        CHF{" "}
                        {priceCalculation.powdercoatServicesPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {priceCalculation.percentageDiscount > 0 && (
                    <div className="flex justify-between text-sm text-amber-400">
                      <span>{t("discount")}</span>
                      <span className="font-bold">
                        -{priceCalculation.percentageDiscount}%
                      </span>
                    </div>
                  )}

                  {priceCalculation.codeDiscount > 0 && (
                    <div className="flex justify-between text-sm text-amber-400">
                      <span>{t("codeDiscount")}</span>
                      <span className="font-bold">
                        -CHF {priceCalculation.codeDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-zinc-300">
                    <span>{getShippingLabel()}</span>
                    <div className="text-right">
                      <span className="font-semibold">
                        {priceCalculation.shipmentCost === 0
                          ? t("free")
                          : `CHF ${priceCalculation.shipmentCost.toFixed(2)}`}
                      </span>
                      {priceCalculation.shipmentCost > 0 &&
                        priceCalculation.freeShippingThreshold > 0 &&
                        (() => {
                          const currentTotal =
                            (priceCalculation.stickersPrice || 0) +
                            (priceCalculation.partsPrice || 0) +
                            (priceCalculation.powdercoatServicesPrice || 0);
                          const remainingAmount =
                            priceCalculation.freeShippingThreshold -
                            currentTotal;

                          return remainingAmount > 0 ? null : <div></div>;
                        })()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold uppercase tracking-wide text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {t("total")}
                  </span>
                  <span className="text-2xl font-bold text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
                    CHF {priceCalculation.totalPrice.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-zinc-500 text-sm">{t("unableToCalculate")}</div>
            )}

            <Link
              href={`/${locale}/checkout`}
              className="group mt-6 flex w-full items-center justify-center gap-2 bg-amber-500 px-6 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-[0_0_40px_rgba(245,158,11,0.2)] transition-all duration-300 hover:bg-amber-400 hover:shadow-[0_0_60px_rgba(245,158,11,0.35)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("proceedToCheckout")}
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      {/* WhatsApp Community Popup */}
      {/* <WhatsAppPopup /> */}
      </div>
    </div>
  );
}
