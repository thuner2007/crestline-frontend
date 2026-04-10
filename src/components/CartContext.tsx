"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import storage from "@/lib/storage";
import { CustomizationOptions } from "@/types/sticker/customizazion.type";
import { Sticker } from "@/types/sticker/sticker.type";
import { CustomSticker } from "@/types/sticker/customsticker.type";
import { useAuth } from "@/context/AuthContext";
import useAxios from "@/useAxios";
import { Part } from "@/app/[locale]/item/[id]/page";

// Helper function to get or create anonymous cart token
const getAnonymousToken = (): string => {
  let token = storage.getItem("cartToken");
  if (!token) {
    token = crypto.randomUUID();
    storage.setItem("cartToken", token);
  }
  return token;
};

export interface CartItem {
  width?: number;
  height?: number;
  amount: number;
  vinyl?: boolean;
  printed?: boolean;
  customizationOptions: CustomizationOptions;
  sticker?: Sticker | CustomSticker;
  type?: "sticker" | "part" | "powdercoat";
  part?: Part;
  partId?: string;
  powdercoatService?: PowdercoatService;
  powdercoatingServiceId?: string;
  powdercoatColorId?: string; // Optional color selection
  powdercoatColor?: PowdercoatColor; // Optional color information from server
  color?: string; // Simple color string for powdercoat services
  id?: string; // Add server-side ID for cart items
}

// Server cart item format for API responses
interface ServerCartItem {
  id: string;
  orderId?: string;
  stickerId?: string;
  customStickerId?: string | null;
  width?: string;
  height?: string;
  vinyl?: boolean;
  printed?: boolean;
  customizationOptions: ServerCustomizationOption[];
  quantity: number;
  sticker?: Sticker;
}

interface ServerPartItem {
  id: string;
  orderId?: string;
  partId: string;
  customizationOptions: ServerCustomizationOption[];
  quantity: number;
  part?: Part;
}

// Server cart response
interface ServerPowdercoatItem {
  id: string;
  orderId?: string;
  powdercoatingServiceId?: string;
  customizationOptions: ServerCustomizationOption[];
  quantity: number;
  color?: string; // Simple color string from server
  powdercoatingService?: PowdercoatService;
}

interface ServerCartResponse {
  id: string;
  userId: string;
  createdAt: string;
  orderItems: ServerCartItem[];
  partOrderItems: ServerPartItem[];
  powdercoatOrderItems: ServerPowdercoatItem[];
}

export interface PartCartItem {
  partId: string;
  amount: number;
  customizationOptions: CustomizationOptions;
  part: Part;
  type: "part";
}

export interface PowdercoatService {
  id: string;
  name: string;
  description: string;
  price: string | number; // API can return either string or number
  active: boolean;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PowdercoatColor {
  id: string;
  color: string;
  active: boolean;
}

export interface PowdercoatCartItem {
  powdercoatingServiceId: string;
  amount: number;
  customizationOptions: CustomizationOptions;
  powdercoatService: PowdercoatService;
  powdercoatColorId?: string; // Optional color selection
  powdercoatColor?: PowdercoatColor; // Optional color information from server
  type: "powdercoat";
  id?: string; // Server-side ID for cart items
}

interface ServerCustomizationOption {
  type: "color" | "inputfield" | "vinylColors" | "dropdown" | "filamentColor";
  value: string;
  translations?: Record<string, { title: string; description?: string }>;
  items?: {
    id: string;
    translations?: Record<string, { title: string; description?: string }>;
  }[];
  priceAdjustment?: number;
  filamentTypeId?: string;
  filamentTypeName?: string;
  colors?: Array<{
    id: string;
    value: string;
    priceAdjustment?: number;
  }>;
  colorDetails?: {
    id: string;
    color: string;
    filamentType?: string;
    filamentTypeId?: string | null;
    active?: boolean;
  };
}

export const priceSettings = {
  additionalPriceVinyl: 2,
  additionalPricePrintable: 2,
  basePriceCustomCm2: 0.05,
  additionalPriceCustom: 2,

  freeShippingThreshold: 100,
  shippingCostLittle: 1.7,
  // bigger than B5 format
  shippingCostMedium: 2.5,
  // bigger than B4 format
  shippingCostBig: 9,

  discountByQuantityPercentage: {
    10: 10,
    20: 20,
    50: 25,
    100: 30,
  },
};

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: CartItem | PartCartItem | PowdercoatCartItem,
  ) => Promise<void>;
  addPowdercoatService: (
    serviceId: string,
    quantity: number,
    customizationOptions?: CustomizationOptions,
  ) => Promise<void>;
  removeItem: (
    stickerOrPart: Sticker | CustomSticker | Part,
    customizations?: CartItem["customizationOptions"],
    width?: number,
    height?: number,
    itemType?: "sticker" | "part",
  ) => Promise<void>;
  removePowdercoatService: (
    serviceId: string,
    customizations?: CartItem["customizationOptions"],
  ) => Promise<void>;
  updateQuantity: (
    stickerOrPart: Sticker | CustomSticker | Part,
    amount: number,
    itemType?: "sticker" | "part",
  ) => Promise<void>;
  updatePowdercoatServiceQuantity: (
    serviceId: string,
    amount: number,
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const axiosInstance = useAxios();
  const { user } = useAuth();
  const userId = user?.id;
  const isAuthenticated = !!userId;

  const [items, setItems] = useState<CartItem[]>([]);

  // Transform server cart items to client format
  const transformServerItems = async (
    response: ServerCartResponse,
  ): Promise<CartItem[]> => {
    try {
      const {
        orderItems = [],
        partOrderItems = [],
        powdercoatOrderItems = [],
      } = response;

      // Process sticker items
      const transformedStickerItems = await Promise.all(
        orderItems.map(async (item: ServerCartItem) => {
          try {
            // If full sticker data is already included in the response
            if (item.sticker) {
              // Process images to ensure correct URLs
              const processedImages = Array.isArray(item.sticker.images)
                ? item.sticker.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/stickers/${img}`;
                  })
                : [];

              return {
                id: item.id,
                type: "sticker",
                sticker: {
                  ...item.sticker,
                  images: processedImages,
                },
                width: parseFloat(item.width ?? "0"),
                height: parseFloat(item.height ?? "0"),
                vinyl: item.vinyl,
                printed: item.printed,
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            } else if (item.stickerId) {
              // Fetch sticker details if not included
              const stickerResponse = await axiosInstance.get<Sticker>(
                `/stickers/${item.stickerId}`,
              );
              const stickerData = stickerResponse.data;

              const processedImages = Array.isArray(stickerData.images)
                ? stickerData.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/stickers/${img}`;
                  })
                : [];

              return {
                id: item.id,
                type: "sticker",
                sticker: {
                  ...stickerData,
                  images: processedImages,
                },
                width: parseFloat(item.width ?? "0"),
                height: parseFloat(item.height ?? "0"),
                vinyl: item.vinyl,
                printed: item.printed,
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            }
          } catch (error) {
            console.error(`Failed to process sticker item ${item.id}:`, error);

            // Fall back to basic data
            return {
              id: item.id,
              type: "sticker",
              sticker: { id: item.stickerId! },
              width: parseFloat(item.width ?? "0"),
              height: parseFloat(item.height ?? "0"),
              vinyl: item.vinyl,
              printed: item.printed,
              amount: item.quantity,
              customizationOptions: {
                options: item.customizationOptions.map(
                  (opt: ServerCustomizationOption) => ({
                    type: opt.type,
                    translations: opt.translations || {},
                    selectedValue: opt.value,
                    ...(opt.type === "filamentColor" && {
                      filamentTypeId: opt.filamentTypeId,
                      filamentTypeName: opt.filamentTypeName,
                      colors: opt.colors,
                      colorDetails: opt.colorDetails,
                    }),
                    ...(opt.type === "dropdown" && {
                      items: opt.items,
                    }),
                    priceAdjustment: opt.priceAdjustment,
                  }),
                ),
              },
            };
          }
          return null;
        }),
      );

      // Process part items
      const transformedPartItems = await Promise.all(
        partOrderItems.map(async (item: ServerPartItem) => {
          try {
            // If full part data is already included in the response
            if (item.part) {
              // Process images to ensure correct URLs
              const processedImages = Array.isArray(item.part.images)
                ? item.part.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/parts/${img}`;
                  })
                : [];

              // Parse customizationOptions if it's a JSON string
              let parsedCustomizationOptions = item.part.customizationOptions;
              if (typeof item.part.customizationOptions === "string") {
                try {
                  parsedCustomizationOptions = JSON.parse(
                    item.part.customizationOptions,
                  );
                } catch (error) {
                  console.error(
                    "Failed to parse part customizationOptions:",
                    error,
                  );
                  parsedCustomizationOptions = { options: [] };
                }
              }

              return {
                id: item.id,
                type: "part",
                partId: item.partId,
                part: {
                  ...item.part,
                  images: processedImages,
                  customizationOptions: parsedCustomizationOptions,
                },
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            } else if (item.partId) {
              // Fetch part details if not included
              const partResponse = await axiosInstance.get<Part>(
                `/parts/${item.partId}`,
              );
              const partData = partResponse.data;

              // Process images to ensure correct URLs
              const processedImages = Array.isArray(partData.images)
                ? partData.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/parts/${img}`;
                  })
                : [];

              // Parse customizationOptions if it's a JSON string
              let parsedCustomizationOptions = partData.customizationOptions;
              if (typeof partData.customizationOptions === "string") {
                try {
                  parsedCustomizationOptions = JSON.parse(
                    partData.customizationOptions,
                  );
                } catch (error) {
                  console.error(
                    "Failed to parse part customizationOptions:",
                    error,
                  );
                  parsedCustomizationOptions = { options: [] };
                }
              }

              return {
                id: item.id,
                type: "part",
                partId: item.partId,
                part: {
                  ...partData,
                  images: processedImages,
                  customizationOptions: parsedCustomizationOptions,
                },
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            }
          } catch (error) {
            console.error(`Failed to process part item ${item.id}:`, error);

            // Fall back to basic data
            return {
              id: item.id,
              type: "part",
              partId: item.partId,
              part: { id: item.partId },
              amount: item.quantity,
              customizationOptions: {
                options: item.customizationOptions.map(
                  (opt: ServerCustomizationOption) => ({
                    type: opt.type,
                    translations: opt.translations || {},
                    selectedValue: opt.value,
                    ...(opt.type === "filamentColor" && {
                      filamentTypeId: opt.filamentTypeId,
                      filamentTypeName: opt.filamentTypeName,
                      colors: opt.colors,
                      colorDetails: opt.colorDetails,
                    }),
                    ...(opt.type === "dropdown" && {
                      items: opt.items,
                    }),
                    priceAdjustment: opt.priceAdjustment,
                  }),
                ),
              },
            };
          }
          return null;
        }),
      );

      // Process powdercoat items
      const transformedPowdercoatItems = await Promise.all(
        powdercoatOrderItems.map(async (item: ServerPowdercoatItem) => {
          try {
            // If full service data is already included in the response
            if (item.powdercoatingService) {
              // Process images to ensure correct URLs
              const processedImages = Array.isArray(
                item.powdercoatingService.images,
              )
                ? item.powdercoatingService.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/powdercoat-services/${img}`;
                  })
                : [];

              return {
                id: item.id,
                type: "powdercoat",
                powdercoatingServiceId: item.powdercoatingServiceId || item.id,
                powdercoatService: {
                  ...item.powdercoatingService,
                  images: processedImages,
                },
                ...(item.color && {
                  powdercoatColorId: item.color,
                  powdercoatColor: {
                    id: item.color,
                    color: item.color,
                    active: true,
                  },
                }),
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            } else {
              // Fetch service details if not included
              const serviceId = item.powdercoatingServiceId || item.id;
              const serviceResponse =
                await axiosInstance.get<PowdercoatService>(
                  `/powdercoatservice/${serviceId}`,
                );
              const serviceData = serviceResponse.data;

              const processedImages = Array.isArray(serviceData.images)
                ? serviceData.images.map((img: string) => {
                    return img.startsWith("http")
                      ? img
                      : `https://minio-api.cwx-dev.com/powdercoat-services/${img}`;
                  })
                : [];

              return {
                id: item.id,
                type: "powdercoat",
                powdercoatingServiceId: serviceId,
                powdercoatService: {
                  ...serviceData,
                  images: processedImages,
                },
                ...(item.color && {
                  powdercoatColorId: item.color,
                  powdercoatColor: {
                    id: item.color,
                    color: item.color,
                    active: true,
                  },
                }),
                amount: item.quantity,
                customizationOptions: {
                  options: item.customizationOptions.map(
                    (opt: ServerCustomizationOption) => ({
                      type: opt.type,
                      translations: opt.translations || {},
                      selectedValue: opt.value,
                      ...(opt.type === "filamentColor" && {
                        filamentTypeId: opt.filamentTypeId,
                        filamentTypeName: opt.filamentTypeName,
                        colors: opt.colors,
                        colorDetails: opt.colorDetails,
                      }),
                      ...(opt.type === "dropdown" && {
                        items: opt.items,
                      }),
                      priceAdjustment: opt.priceAdjustment,
                    }),
                  ),
                },
              };
            }
          } catch (error) {
            console.error(
              `Failed to process powdercoat item ${item.id}:`,
              error,
            );

            // Fall back to basic data
            const fallbackServiceId = item.powdercoatingServiceId || item.id;
            return {
              id: item.id,
              type: "powdercoat",
              powdercoatingServiceId: fallbackServiceId,
              powdercoatService: {
                id: fallbackServiceId,
                name: "Unknown Service",
                description: "",
                price: 0,
                active: true,
                images: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              amount: item.quantity,
              customizationOptions: {
                options: item.customizationOptions.map(
                  (opt: ServerCustomizationOption) => ({
                    type: opt.type,
                    translations: opt.translations || {},
                    selectedValue: opt.value,
                    ...(opt.type === "filamentColor" && {
                      filamentTypeId: opt.filamentTypeId,
                      filamentTypeName: opt.filamentTypeName,
                      colors: opt.colors,
                      colorDetails: opt.colorDetails,
                    }),
                    ...(opt.type === "dropdown" && {
                      items: opt.items,
                    }),
                    priceAdjustment: opt.priceAdjustment,
                  }),
                ),
              },
            };
          }
        }),
      );

      // Combine and filter out any null items
      const allItems = [
        ...transformedStickerItems,
        ...transformedPartItems,
        ...transformedPowdercoatItems,
      ];
      return allItems.filter(Boolean) as unknown as CartItem[];
    } catch (error) {
      console.error("Error transforming server items:", error);
      return [];
    }
  };

  // Function to fetch the latest cart from server
  const fetchCartFromServer = async (): Promise<CartItem[]> => {
    try {
      let response: { data: ServerCartResponse };

      // console.log("=== FETCHING CART FROM SERVER ===");
      // console.log("Is authenticated:", isAuthenticated);
      // console.log("User ID:", userId);

      if (isAuthenticated && userId) {
        // Authenticated user - use userId
        // console.log("Fetching cart with userId:", userId);
        response = await axiosInstance.get<ServerCartResponse>(
          `/cart?userId=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${storage.getItem("access_token")}`,
            },
          },
        );
      } else {
        // Anonymous user - use anonymousToken
        const anonymousToken = getAnonymousToken();
        // console.log("Fetching cart with anonymousToken:", anonymousToken);
        response = await axiosInstance.get<ServerCartResponse>(
          `/cart?anonymousToken=${anonymousToken}`,
        );
      }

      // console.log("Raw cart response from server:", JSON.stringify(response.data, null, 2));
      // console.log("Cart ID:", response.data?.id);
      // console.log("Order items (stickers):", response.data?.orderItems?.length || 0);
      // console.log("Part order items:", response.data?.partOrderItems?.length || 0);
      // console.log("Powdercoat order items:", response.data?.powdercoatOrderItems?.length || 0);

      if (response.data) {
        // Transform server items to client format
        const clientItems = await transformServerItems(response.data);
        // console.log("Transformed client items:", clientItems.length);
        // console.log("Client items:", JSON.stringify(clientItems, null, 2));
        return clientItems;
      }
      // console.log("No cart data received, returning empty array");
      return [];
    } catch (error) {
      console.error("=== FAILED TO FETCH CART ===");
      console.error("Error:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
        console.error("Response status:", axiosError.response?.status);
        console.error("Response data:", axiosError.response?.data);
      }
      // Return empty cart on error instead of falling back to localStorage
      // The server is now the source of truth
      return [];
    }
  };

  // Add item to cart
  const addItem = async (
    newItem: CartItem | PartCartItem | PowdercoatCartItem,
  ) => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);

      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Check if an identical item already exists in the cart
      let existingItem: CartItem | undefined;

      if (newItem.type === "powdercoat") {
        const powdercoatItem = newItem as PowdercoatCartItem;
        existingItem = items.find(
          (item) =>
            item.type === "powdercoat" &&
            item.powdercoatService?.id ===
              powdercoatItem.powdercoatingServiceId &&
            item.powdercoatColorId === powdercoatItem.powdercoatColorId &&
            JSON.stringify(item.customizationOptions) ===
              JSON.stringify(powdercoatItem.customizationOptions),
        );
      } else if (newItem.type === "part") {
        const partItem = newItem as PartCartItem;
        existingItem = items.find(
          (item) =>
            item.type === "part" &&
            item.partId === partItem.partId &&
            JSON.stringify(item.customizationOptions) ===
              JSON.stringify(partItem.customizationOptions),
        );
      } else {
        // Sticker item
        const stickerItem = newItem as CartItem;
        existingItem = items.find(
          (item) =>
            item.type === "sticker" &&
            item.sticker?.id === stickerItem.sticker?.id &&
            item.width === stickerItem.width &&
            item.height === stickerItem.height &&
            item.vinyl === stickerItem.vinyl &&
            item.printed === stickerItem.printed &&
            JSON.stringify(item.customizationOptions) ===
              JSON.stringify(stickerItem.customizationOptions),
        );
      }

      // If identical item exists, update its quantity instead of adding a new item
      if (existingItem && existingItem.id) {
        const newQuantity = existingItem.amount + newItem.amount;

        if (existingItem.type === "powdercoat") {
          await axiosInstance.patch<void>(
            `/cart/powdercoat-service/amount/${existingItem.id}?${authParams}`,
            { amount: newQuantity },
            { headers: authHeaders },
          );
        } else if (existingItem.type === "part") {
          await axiosInstance.patch<void>(
            `/cart/part/amount/${existingItem.id}?${authParams}`,
            { amount: newQuantity },
            { headers: authHeaders },
          );
        } else {
          await axiosInstance.patch<void>(
            `/cart/sticker/amount/${existingItem.id}?${authParams}`,
            { amount: newQuantity },
            { headers: authHeaders },
          );
        }

        // Refresh cart from server to get updated state
        await refreshCart();
        return;
      }

      // No existing item found, proceed with adding a new item
      // Handle different item types
      if (newItem.type === "powdercoat") {
        const powdercoatItem = newItem as PowdercoatCartItem;

        // Sync with server using the new powdercoat endpoint
        const powdercoatData = {
          powdercoatingServiceId: powdercoatItem.powdercoatingServiceId,
          quantity: powdercoatItem.amount,
          color: powdercoatItem.powdercoatColorId || "",
          customizationOptions: [], // Empty array as per API spec
        };

        // Validate required fields
        if (!powdercoatData.powdercoatingServiceId) {
          throw new Error("Missing powdercoatingServiceId");
        }
        if (!powdercoatData.quantity || powdercoatData.quantity < 1) {
          throw new Error("Invalid quantity");
        }

        await axiosInstance.post<void>(
          `/cart/powdercoat-service?${authParams}`,
          powdercoatData,
          { headers: authHeaders },
        );
      } else if (newItem.type === "part") {
        // Format for the new /cart/part endpoint
        const partData = {
          partId: newItem.partId,
          quantity: newItem.amount,
          customizationOptions: newItem.customizationOptions.options
            .map((option) => {
              const optionValue =
                "selectedValue" in option
                  ? option.selectedValue || ""
                  : "value" in option
                    ? option.value || ""
                    : "";

              return {
                type: option.type,
                value: optionValue,
                translations: option.translations,
                ...("priceAdjustment" in option && {
                  priceAdjustment: option.priceAdjustment,
                }),
                ...("items" in option && { items: option.items }),
              };
            })
            .filter((opt) => opt.value), // Only include options with values
        };

        // console.log("=== ADDING PART TO CART ===");
        // console.log("Auth params:", authParams);
        // console.log("Part data being sent:", JSON.stringify(partData, null, 2));
        // console.log("Full URL:", `/cart/part?${authParams}`);
        // console.log("Headers:", authHeaders);

        await axiosInstance.post<void>(`/cart/part?${authParams}`, partData, {
          headers: authHeaders,
        });

        // console.log("Part added successfully to cart");
      } else {
        // Handle sticker items
        const stickerItem = newItem as CartItem;

        if (stickerItem.sticker) {
          // Format for the new /cart/sticker endpoint
          const stickerData = {
            stickerId: stickerItem.sticker.id,
            width: stickerItem.width || 10,
            height: stickerItem.height || 10,
            vinyl: stickerItem.vinyl ?? true,
            printed: stickerItem.printed ?? false,
            quantity: newItem.amount,
            customizationOptions: newItem.customizationOptions.options
              .map((option) => {
                const optionValue =
                  "selectedValue" in option
                    ? option.selectedValue || ""
                    : "value" in option
                      ? option.value || ""
                      : "";

                return {
                  type: option.type,
                  value: optionValue,
                  translations: option.translations,
                  ...("priceAdjustment" in option && {
                    priceAdjustment: option.priceAdjustment,
                  }),
                  ...("items" in option && { items: option.items }),
                };
              })
              .filter((opt) => opt.value), // Only include options with values
          };

          await axiosInstance.post<void>(
            `/cart/sticker?${authParams}`,
            stickerData,
            { headers: authHeaders },
          );
        }
      }

      // Refresh cart from server to get updated state
      await refreshCart();
    } catch (error) {
      console.error("=== FAILED TO ADD ITEM TO CART ===");
      console.error("Error:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: unknown; status?: number };
        };
        console.error("Response status:", axiosError.response?.status);
        console.error("Response data:", axiosError.response?.data);
      }
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch cart on initial load
  useEffect(() => {
    const loadCart = async () => {
      try {
        // Fetch cart items from server
        const fetchedItems = await fetchCartFromServer();
        setItems(fetchedItems);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error loading cart:", error);
        setInitialLoadComplete(true);
      }
    };

    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);

  // Add powdercoat service to cart (dedicated function)
  const addPowdercoatService = async (
    serviceId: string,
    quantity: number,
    customizationOptions: CustomizationOptions = { options: [] },
  ) => {
    try {
      // First fetch the service details
      const serviceResponse = await axiosInstance.get<PowdercoatService>(
        `/powdercoatservice/${serviceId}`,
      );
      const serviceData = serviceResponse.data;

      // Process images to ensure correct URLs
      const processedImages = Array.isArray(serviceData.images)
        ? serviceData.images.map((img: string) => {
            return img.startsWith("http")
              ? img
              : `https://minio-api.cwx-dev.com/powdercoat-services/${img}`;
          })
        : [];

      // Create powdercoat cart item
      const powdercoatCartItem: PowdercoatCartItem = {
        type: "powdercoat",
        powdercoatingServiceId: serviceId,
        amount: quantity,
        customizationOptions,
        powdercoatService: {
          ...serviceData,
          images: processedImages,
        },
      };

      // Add to cart using existing addItem function
      await addItem(powdercoatCartItem);
    } catch (error) {
      console.error("Failed to add powdercoat service to cart:", error);
      throw error;
    }
  };

  // Remove item from cart
  const removeItem = async (
    stickerOrPart: Sticker | CustomSticker | Part,
    customizationOptions?: CartItem["customizationOptions"],
    width?: number,
    height?: number,
    itemType: "sticker" | "part" = "sticker",
  ) => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);

      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Find the item to remove
      let itemToRemove: CartItem | undefined;

      if (itemType === "part") {
        itemToRemove = items.find(
          (item) =>
            item.type === "part" &&
            item.part?.id === (stickerOrPart as Part).id &&
            JSON.stringify(item.customizationOptions) ===
              JSON.stringify(customizationOptions),
        );
      } else {
        itemToRemove = items.find(
          (item) =>
            item.type !== "part" &&
            item.sticker?.id ===
              (stickerOrPart as Sticker | CustomSticker).id &&
            item.width === width &&
            item.height === height &&
            JSON.stringify(item.customizationOptions) ===
              JSON.stringify(customizationOptions),
        );
      }

      // If no item found, nothing to do
      if (!itemToRemove || !itemToRemove.id) {
        setIsSyncing(false);
        return;
      }

      // Delete from server
      if (itemToRemove.type === "part") {
        await axiosInstance.delete<void>(
          `/cart/part/${itemToRemove.id}?${authParams}`,
          { headers: authHeaders },
        );
      } else if (itemToRemove.type === "powdercoat") {
        await axiosInstance.delete<void>(
          `/cart/powdercoat-service/${itemToRemove.id}?${authParams}`,
          { headers: authHeaders },
        );
      } else {
        await axiosInstance.delete<void>(
          `/cart/sticker/${itemToRemove.id}?${authParams}`,
          { headers: authHeaders },
        );
      }

      // Refresh cart from server to get updated state
      await refreshCart();
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (
    stickerOrPart: Sticker | CustomSticker | Part,
    amount: number,
    itemType: "sticker" | "part" = "sticker",
  ) => {
    if (isSyncing || amount < 1) {
      return;
    }

    try {
      setIsSyncing(true);

      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Find the item to update
      let itemToUpdate: CartItem | undefined;

      if (itemType === "part") {
        itemToUpdate = items.find(
          (item) =>
            item.type === "part" &&
            item.part?.id === (stickerOrPart as Part).id,
        );
      } else {
        itemToUpdate = items.find(
          (item) =>
            item.type !== "part" &&
            item.sticker?.id === (stickerOrPart as Sticker | CustomSticker).id,
        );
      }

      // If no item found or no ID, nothing to do
      if (!itemToUpdate || !itemToUpdate.id) {
        setIsSyncing(false);
        return;
      }

      // Update quantity on server
      if (itemToUpdate.type === "part") {
        await axiosInstance.patch<void>(
          `/cart/part/amount/${itemToUpdate.id}?${authParams}`,
          { amount },
          { headers: authHeaders },
        );
      } else if (itemToUpdate.type === "powdercoat") {
        await axiosInstance.patch<void>(
          `/cart/powdercoat-service/amount/${itemToUpdate.id}?${authParams}`,
          { amount },
          { headers: authHeaders },
        );
      } else {
        await axiosInstance.patch<void>(
          `/cart/sticker/amount/${itemToUpdate.id}?${authParams}`,
          { amount },
          { headers: authHeaders },
        );
      }

      // Refresh cart from server to get updated state
      await refreshCart();
    } catch (error) {
      console.error("Failed to update quantity:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Remove powdercoat service from cart
  const removePowdercoatService = async (
    serviceId: string,
    customizations?: CartItem["customizationOptions"],
  ) => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);

      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Find the item to remove
      const itemToRemove = items.find(
        (item) =>
          item.type === "powdercoat" &&
          item.powdercoatService?.id === serviceId &&
          JSON.stringify(item.customizationOptions) ===
            JSON.stringify(customizations),
      );

      // If no item found or no ID, nothing to do
      if (!itemToRemove || !itemToRemove.id) {
        setIsSyncing(false);
        return;
      }

      // Delete from server
      await axiosInstance.delete<void>(
        `/cart/powdercoat-service/${itemToRemove.id}?${authParams}`,
        { headers: authHeaders },
      );

      // Refresh cart from server to get updated state
      await refreshCart();
    } catch (error) {
      console.error("Failed to remove powdercoat service from cart:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Update powdercoat service quantity
  const updatePowdercoatServiceQuantity = async (
    serviceId: string,
    amount: number,
  ) => {
    if (isSyncing || amount < 1) {
      return;
    }

    try {
      setIsSyncing(true);

      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Find the item to update
      const itemToUpdate = items.find(
        (item) =>
          item.type === "powdercoat" &&
          item.powdercoatService?.id === serviceId,
      );

      // If no item found or no ID, nothing to do
      if (!itemToUpdate || !itemToUpdate.id) {
        setIsSyncing(false);
        return;
      }

      // Update quantity on server
      await axiosInstance.patch<void>(
        `/cart/powdercoat-service/amount/${itemToUpdate.id}?${authParams}`,
        { amount },
        { headers: authHeaders },
      );

      // Refresh cart from server to get updated state
      await refreshCart();
    } catch (error) {
      console.error("Failed to update powdercoat service quantity:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear the entire cart
  const clearCart = async () => {
    try {
      // Get auth params for API calls
      const authParams =
        isAuthenticated && userId
          ? `userId=${userId}`
          : `anonymousToken=${getAnonymousToken()}`;

      const authHeaders =
        isAuthenticated && userId
          ? { Authorization: `Bearer ${storage.getItem("access_token")}` }
          : {};

      // Use the DELETE /cart/clear endpoint
      await axiosInstance.delete<void>(`/cart/clear?${authParams}`, {
        headers: authHeaders,
      });

      // Refresh cart from server to ensure sync
      await refreshCart();
    } catch (error) {
      console.error("Failed to clear cart on server:", error);
      // Clear local state anyway
      setItems([]);
    }
  };

  // Refresh cart from server
  const refreshCart = async () => {
    try {
      const fetchedItems = await fetchCartFromServer();
      setItems(fetchedItems);
    } catch (error) {
      console.error("Failed to refresh cart:", error);
    }
  };

  // Create context value
  const value = React.useMemo(
    () => ({
      items,
      addItem,
      addPowdercoatService,
      removeItem,
      removePowdercoatService,
      updateQuantity,
      updatePowdercoatServiceQuantity,
      clearCart,
      refreshCart,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, initialLoadComplete, isSyncing],
  );

  return (
    //<PayPalScriptProvider
    //   options={{
    //     clientId: PAYPAL_CLIENT_ID!,
    //     currency: 'CHF',
    //   }}
    // >
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
    //</PayPalScriptProvider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
