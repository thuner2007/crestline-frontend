"use client";

import { useState, useEffect, useMemo } from "react";

// Suppress browser extension errors in production
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || "";
    // Filter out known browser extension errors
    if (
      errorMessage.includes("bootstrap-autofill-overlay") ||
      errorMessage.includes("insertBefore")
    ) {
      return; // Silently ignore these errors
    }
    originalError.apply(console, args);
  };
}

import { CartItem, priceSettings, useCart } from "@/components/CartContext";
import useCsrfToken from "@/useCsrfToken";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import Image from "next/image";
import storage from "@/lib/storage";
import AGBCheckbox from "@/components/AGBCheckbox";
import { PaymentMethods } from "@/types/paymentMethods.enum";
import { CreateStickerOrder } from "@/types/stickerOrder/createStickerOrder.type";
import { StickerOrderItem } from "@/types/stickerOrder/orderItems.type";
import {
  BaseCustomizationOption,
  CustomizationOption,
  DropdownOption,
} from "@/types/sticker/customizazion.type";
import useAxios from "@/useAxios";
import { ChevronDown, ChevronUp } from "lucide-react";
import CheckoutWhatsAppButton from "@/components/CheckoutWhatsAppButton";
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

interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

interface OptionTranslation {
  title?: string;
}

interface SelectedItemTranslations {
  [locale: string]: OptionTranslation;
  en: OptionTranslation;
}

interface PartOrderItem {
  partId: string;
  quantity: number;
  customizationOptions: Array<{
    type: string;
    value: string;
    optionId: string;
    priceAdjustment?: number;
    selectedItemPriceAdjustment?: number;
  }>;
}

export type DropdownCustomizationOption = CustomizationOption & {
  selectedValue?: string;
  selectedItemTranslations?: SelectedItemTranslations;
};

interface DiscountResponse {
  type: "percentage" | "fixed" | "free_shipping";
  value: string;
}

interface UserAddressData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  additionalAddressInfo?: string;
}

interface PriceCalculationResponse {
  totalPrice: number;
  shipmentCost: number;
  stickersPrice: number;
  partsPrice: number;
  powdercoatServicesPrice: number; // Added powdercoat services price
  discountPercentage: number;
  codeDiscount: number;
  totalQuantity: number;
  freeShippingThreshold: number;
}

interface UserApiResponse {
  statusCode: number;
  data: {
    id: number;
    username: string;
    role: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    houseNumber: string;
    zipCode: string;
    city: string;
    country: string;
    additionalAddressInfo: string;
  };
}

const addressSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "First name can only contain letters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Last name can only contain letters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\s]+$/, "Phone can only contain numbers and +"),
  street: z
    .string()
    .min(1, "Street is required")
    .regex(
      /^[A-Za-zÀ-ÖØ-öø-ÿ\s\d\.\-]+$/,
      "Street can only contain letters, numbers and spaces",
    ),
  houseNumber: z
    .string()
    .min(1, "House number is required")
    .regex(/^[0-9]+$/, "House number can only contain numbers"),
  zipCode: z
    .string()
    .min(4, "Valid ZIP code required")
    .regex(/^[0-9]+$/, "ZIP code can only contain numbers"),
  city: z
    .string()
    .min(1, "City is required")
    .regex(
      /^[A-Za-zÀ-ÖØ-öø-ÿ\s\d\.\-]+$/,
      "City can only contain letters, numbers and spaces",
    ),
  country: z.string().min(1, "Country is required"),
  additionalAddressInfo: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

function AddressForm({
  onAddressChange,
  fieldErrors,
  defaultValues,
}: {
  onAddressChange: (address: Partial<CreateStickerOrder>) => void;
  fieldErrors: Record<string, string>;
  defaultValues?: UserAddressData;
}) {
  const {
    register,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const t = useTranslations("checkout");

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [searchAbortController, setSearchAbortController] =
    useState<AbortController | null>(null);

  // Function to search addresses using Nominatim API (via backend proxy)
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel previous search if still running
    if (searchAbortController) {
      searchAbortController.abort();
    }

    const abortController = new AbortController();
    setSearchAbortController(abortController);

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/address-search?q=${encodeURIComponent(query)}`,
        {
          signal: abortController.signal,
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: AddressSuggestion[] = await response.json();

      // Filter for addresses that have meaningful location data
      const filteredData = data.filter((item) => {
        if (!item.address) return false;
        // Include if it has a road, house number, or other location identifiers
        return !!(
          item.address.road ||
          item.address.house_number ||
          item.address.city ||
          item.address.town ||
          item.address.village
        );
      });

      setAddressSuggestions(filteredData);
      setShowSuggestions(filteredData.length > 0);
    } catch (error: unknown) {
      // Don't log abort errors - they're expected
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Address search error:", error);
      }
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
      setSearchAbortController(null);
    }
  };

  // Handle address selection
  const selectAddress = (suggestion: AddressSuggestion) => {
    const { address } = suggestion;

    // Update form fields with selected address
    if (address.road) {
      setValue("street", address.road, { shouldValidate: true });
    }
    if (address.house_number) {
      setValue("houseNumber", address.house_number, { shouldValidate: true });
    }
    if (address.postcode) {
      setValue("zipCode", address.postcode, { shouldValidate: true });
    }
    if (address.city || address.town || address.village) {
      const city = address.city || address.town || address.village || "";
      setValue("city", city, { shouldValidate: true });
    }
    if (address.country_code) {
      setValue("country", address.country_code.toUpperCase(), {
        shouldValidate: true,
      });
    }

    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Debounced search function - waits 700ms after user stops typing
  const handleAddressSearch = (value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchAddresses(value);
    }, 700);

    setSearchTimeout(timeout);
  };

  // New improved input validation function
  const handleInputValidation = (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    pattern: RegExp,
  ) => {
    const input = event.target.value;

    // Apply the regex pattern and sanitize if needed
    if (input) {
      // If input doesn't match pattern, sanitize it
      if (!pattern.test(input)) {
        // Create sanitized value based on pattern
        const sanitized = input.replace(
          fieldName === "firstName" || fieldName === "lastName"
            ? /[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g
            : fieldName === "street" || fieldName === "city"
              ? /[^A-Za-zÀ-ÖØ-öø-ÿ\s\d\.\-]/g
              : fieldName === "phone"
                ? /[^0-9+\s]/g
                : /[^0-9]/g,
          "",
        );

        // Important: Update the form value through setValue
        setValue(fieldName as keyof AddressFormData, sanitized, {
          shouldValidate: true,
        });

        // Stop the default onChange behavior
        event.preventDefault();
        return sanitized; // Return the sanitized value
      }
    }
    return input; // Return the original input if valid
  };

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    const subscription = watch((value) => {
      onAddressChange(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onAddressChange]);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (searchAbortController) {
        searchAbortController.abort();
      }
    };
  }, [searchTimeout, searchAbortController]);

  return (
    <div className="mb-4 xxs:mb-6 xs:mb-6 sm:mb-8 space-y-3 xxs:space-y-4 xs:space-y-4">
      <h2
        className="text-base xxs:text-lg xs:text-lg sm:text-xl font-bold uppercase tracking-wide text-white mb-3 xxs:mb-4 xs:mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("shippingAddress")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xxs:gap-4 xs:gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("firstName")}
          </label>

          <input
            {...register("firstName", {
              onChange: (e) => {
                handleInputValidation(e, "firstName", /^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.firstName || fieldErrors.firstName
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.firstName || fieldErrors.firstName) && (
              <p className="text-xs text-red-400">
                {errors.firstName?.message || fieldErrors.firstName}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("lastName")}
          </label>

          <input
            {...register("lastName", {
              onChange: (e) => {
                handleInputValidation(e, "lastName", /^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.lastName || fieldErrors.lastName
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.lastName || fieldErrors.lastName) && (
              <p className="text-xs text-red-400">
                {errors.lastName?.message || fieldErrors.lastName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Email and Phone fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xxs:gap-4 xs:gap-4">
        {/* Email field doesn't need character restriction - browsers handle email validation */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("email")}
          </label>
          <input
            type="email"
            {...register("email")}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.email || fieldErrors.email
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.email || fieldErrors.email) && (
              <p className="text-xs text-red-400">
                {errors.email?.message || fieldErrors.email}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("phone")}
          </label>

          <input
            type="tel"
            {...register("phone", {
              onChange: (e) => {
                handleInputValidation(e, "phone", /^[0-9+\s]*$/);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.phone || fieldErrors.phone
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.phone || fieldErrors.phone) && (
              <p className="text-xs text-red-400">
                {errors.phone?.message || fieldErrors.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Street and House Number */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xxs:gap-4 xs:gap-4">
        <div className="sm:col-span-2 relative">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("street")}
          </label>

          <input
            {...register("street", {
              onChange: (e) => {
                // Trigger address search while maintaining form state
                handleAddressSearch(e.target.value);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.street || fieldErrors.street
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
            placeholder={
              t("startTypingAddress") || "Start typing your address..."
            }
            autoComplete="off"
            onFocus={() => {
              const currentValue = watch("street");
              if (currentValue && currentValue.length >= 3) {
                handleAddressSearch(currentValue);
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking on them
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />

          {/* Loading indicator */}
          {isSearching && (
            <div className="absolute right-3 top-9 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
            </div>
          )}

          {/* Address suggestions dropdown */}
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-h-60 overflow-auto left-0 right-0">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full px-4 py-3 sm:py-2 text-left hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none border-b border-zinc-800 last:border-b-0 transition-colors"
                  onClick={() => selectAddress(suggestion)}
                >
                  <div className="text-sm font-medium text-zinc-200">
                    {suggestion.address.road || ""}{" "}
                    {suggestion.address.house_number || ""}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {suggestion.address.postcode || ""}{" "}
                    {suggestion.address.city ||
                      suggestion.address.town ||
                      suggestion.address.village ||
                      ""}
                  </div>
                </button>
              ))}
            </div>
          )}

          {(errors.street || fieldErrors.street) && (
            <p className="text-xs text-red-400 mb-1">
              {errors.street?.message || fieldErrors.street}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("houseNumber")}
          </label>

          <input
            {...register("houseNumber", {
              onChange: (e) => {
                handleInputValidation(e, "houseNumber", /^[0-9]*$/);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.houseNumber || fieldErrors.houseNumber
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.houseNumber || fieldErrors.houseNumber) && (
              <p className="text-xs text-red-400">
                {errors.houseNumber?.message || fieldErrors.houseNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ZIP and City */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xxs:gap-4 xs:gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("zipCode")}
          </label>

          <input
            {...register("zipCode", {
              onChange: (e) => {
                handleInputValidation(e, "zipCode", /^[0-9]*$/);
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.zipCode || fieldErrors.zipCode
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.zipCode || fieldErrors.zipCode) && (
              <p className="text-xs text-red-400">
                {errors.zipCode?.message || fieldErrors.zipCode}
              </p>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
            {t("city")}
          </label>

          <input
            {...register("city", {
              onChange: (e) => {
                handleInputValidation(
                  e,
                  "city",
                  /^[A-Za-zÀ-ÖØ-öø-ÿ\s\d\.\-]*$/,
                );
              },
            })}
            className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
              errors.city || fieldErrors.city
                ? "border-red-500 focus:border-red-500 focus:ring-0"
                : "border-zinc-700 focus:border-amber-500 focus:ring-0"
            }`}
          />
          <div className="h-5">
            {(errors.city || fieldErrors.city) && (
              <p className="text-xs text-red-400">
                {errors.city?.message || fieldErrors.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Country dropdown */}
      <div className="mt-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
          {t("country")}
        </label>

        <select
          {...register("country")}
          className={`mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border bg-zinc-950 text-zinc-200 text-sm xxs:text-sm xs:text-base sm:text-sm ${
            errors.country || fieldErrors.country
              ? "border-red-500 focus:border-red-500 focus:ring-0"
              : "border-zinc-700 focus:border-amber-500 focus:ring-0"
          }`}
        >
          <option value="CH">{t("switzerland")}</option>
          <option value="DE">{t("germany")}</option>
          <option value="AT">{t("austria")}</option>
          <option value="FR">{t("france")}</option>
          <option value="IT">{t("italy")}</option>
          <option value="LI">{t("liechtenstein")}</option>
          <option value="NL">{t("netherlands")}</option>
          <option value="BE">{t("belgium")}</option>
          <option value="LU">{t("luxembourg")}</option>
          <option value="ES">{t("spain")}</option>
          <option value="PT">{t("portugal")}</option>
          <option value="SE">{t("sweden")}</option>
          <option value="NO">{t("norway")}</option>
          <option value="DK">{t("denmark")}</option>
          <option value="GB">{t("unitedKingdom")}</option>
          <option value="FI">{t("finland")}</option>
          <option value="IE">{t("ireland")}</option>
          <option value="BG">{t("bulgaria")}</option>
          <option value="HR">{t("croatia")}</option>
          <option value="CY">{t("cyprus")}</option>
          <option value="CZ">{t("czechRepublic")}</option>
          <option value="EE">{t("estonia")}</option>
          <option value="GR">{t("greece")}</option>
          <option value="HU">{t("hungary")}</option>
          <option value="LV">{t("latvia")}</option>
          <option value="LT">{t("lithuania")}</option>
          <option value="MT">{t("malta")}</option>
          <option value="PL">{t("poland")}</option>
          <option value="RO">{t("romania")}</option>
          <option value="SK">{t("slovakia")}</option>
          <option value="SI">{t("slovenia")}</option>
        </select>
        <div className="h-5">
          {(errors.country || fieldErrors.country) && (
            <p className="text-xs text-red-400">
              {errors.country?.message || fieldErrors.country}
            </p>
          )}
        </div>
        {watch("country") && watch("country") !== "CH" && (
          <p className="mt-1 text-xs text-amber-400">
            ⚠️ {t("customDutiesNotice")}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>
          {t("additionalAddressInfo")}
        </label>
        <textarea
          {...register("additionalAddressInfo")}
          rows={2}
          className="mt-1 p-2 xxs:p-2.5 xs:p-3 sm:p-2 block w-full border border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-amber-500 focus:ring-0 text-sm xxs:text-sm xs:text-base sm:text-sm"
        />
      </div>
    </div>
  );
}

interface CheckoutFormProps {
  addressData: Partial<CreateStickerOrder>;
  setFieldErrors: (errors: Record<string, string>) => void;
  paymentError: string;
  setPaymentError: (error: string) => void;
  fieldErrors: Record<string, string>;
  userId: number | null;
  csrfToken: string;
  discountCode: string;
  finalTotal: number;
  shipmentCost: number;
  items: CartItem[];
  isCalculating: boolean;
}

function CheckoutForm({
  addressData,
  setFieldErrors,
  setPaymentError,
  fieldErrors,
  userId,
  csrfToken,
  discountCode,
  items,
  finalTotal,
  shipmentCost,
  isCalculating,
}: CheckoutFormProps) {
  const [processing, setProcessing] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const axiosInstance = useAxios();

  const t = useTranslations("checkout");

  // Function to map cart items to order items
  const mapCartItemsToOrderItems = (
    cartItems: CartItem[],
  ): {
    stickerItems: StickerOrderItem[];
    partItems: PartOrderItem[];
    powdercoatServiceItems: Array<{
      powdercoatingServiceId: string;
      quantity: number;
      color: string;
    }>;
  } => {
    const stickerItems: StickerOrderItem[] = [];
    const partItems: PartOrderItem[] = [];
    const powdercoatServiceItems: Array<{
      powdercoatingServiceId: string;
      quantity: number;
      color: string;
    }> = [];

    cartItems.forEach((item) => {
      if (item.type === "part" && item.part) {
        // Handle part items
        partItems.push({
          partId: item.part.id,
          quantity: item.amount,
          customizationOptions:
            item.customizationOptions?.options?.map((option) => {
              // Use part schema as source of truth for price adjustments
              let partSchema = item.part!.customizationOptions as any;
              if (typeof partSchema === "string") {
                try { partSchema = JSON.parse(partSchema); } catch { partSchema = null; }
              }
              const schemaOptions: any[] = partSchema?.options || [];
              const schemaOpt = schemaOptions.find(
                (so) =>
                  so.type === option.type &&
                  so.translations?.en?.title === option.translations?.en?.title,
              );

              const selectedVal =
                "selectedValue" in option
                  ? String(option.selectedValue ?? "")
                  : "value" in option
                    ? String(option.value ?? "")
                    : "";

              const optAdj =
                schemaOpt?.priceAdjustment ??
                ("priceAdjustment" in option ? (option as any).priceAdjustment : undefined);

              let selectedItemPriceAdjustment: number | undefined;
              if (option.type === "dropdown" && selectedVal) {
                const itemsList: any[] = schemaOpt?.items || (option as any).items || [];
                const selItem = itemsList.find((i: any) => i.id === selectedVal);
                selectedItemPriceAdjustment = selItem?.priceAdjustment;
              }

              return {
                type: option.type,
                value: selectedVal,
                optionId: option.translations.en.title,
                ...(optAdj != null && optAdj !== 0 ? { priceAdjustment: optAdj } : {}),
                ...(selectedItemPriceAdjustment != null
                  ? { selectedItemPriceAdjustment }
                  : {}),
              };
            }) || [],
        });
      } else if (item.type === "powdercoat" && item.powdercoatService) {
        // Handle powdercoat service items
        powdercoatServiceItems.push({
          powdercoatingServiceId: item.powdercoatService.id,
          quantity: item.amount,
          color: item.powdercoatColorId || item.color || "", // Always include color field
        });
      } else if (item.sticker) {
        // Handle sticker items
        stickerItems.push({
          stickerId: item.sticker.id,
          quantity: item.amount,
          width: item.width || 0,
          height: item.height || 0,
          vinyl: item.vinyl || false,
          printed: item.printed || false,
          customizationOptions:
            item.customizationOptions?.options?.map((option) => ({
              type: option.type,
              value:
                "selectedValue" in option
                  ? String(option.selectedValue ?? "")
                  : "value" in option
                    ? String(option.value ?? "")
                    : "",
              optionId: option.translations.en.title,
            })) || [],
        });
      }
    });

    return { stickerItems, partItems, powdercoatServiceItems };
  };

  // Function to scroll to the first error field
  const scrollToFirstError = (fieldName: string) => {
    // Map field names to their corresponding input selectors
    const fieldSelectors: Record<string, string> = {
      firstName: 'input[name="firstName"]',
      lastName: 'input[name="lastName"]',
      email: 'input[type="email"][name="email"]',
      phone: 'input[type="tel"][name="phone"]',
      street: 'input[name="street"]',
      houseNumber: 'input[name="houseNumber"]',
      zipCode: 'input[name="zipCode"]',
      city: 'input[name="city"]',
      country: 'select[name="country"]',
      agb: '[data-testid="agb-checkbox"]',
    };

    const selector = fieldSelectors[fieldName];
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Focus the element if it's an input or select
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement
        ) {
          setTimeout(() => element.focus(), 300);
        } else if (fieldName === "agb") {
          // For AGB checkbox, focus the actual checkbox input inside
          const checkboxInput = element.querySelector('input[type="checkbox"]');
          if (checkboxInput instanceof HTMLInputElement) {
            setTimeout(() => checkboxInput.focus(), 300);
          }
        }
      }
    }
  };

  // Function to submit order to backend
  const submitOrderToBackend = async (): Promise<{ id: string } | null> => {
    try {
      const { stickerItems, partItems, powdercoatServiceItems } =
        mapCartItemsToOrderItems(items);

      const orderData: CreateStickerOrder & {
        partOrderItems?: PartOrderItem[];
        powdercoatServiceOrderItems?: Array<{
          powdercoatingServiceId: string;
          quantity: number;
          color: string;
        }>;
        shipmentCost?: number;
      } = {
        ...addressData,
        firstName: addressData.firstName || "",
        lastName: addressData.lastName || "",
        email: addressData.email || "",
        phone: addressData.phone || "",
        street: addressData.street || "",
        houseNumber: addressData.houseNumber || "",
        zipCode: addressData.zipCode || "",
        city: addressData.city || "",
        country: addressData.country || "CH",
        orderItems: stickerItems,
        partOrderItems: partItems, // Add part order items here
        powdercoatServiceOrderItems: powdercoatServiceItems, // Add powdercoat service items here
        paymentMethod: PaymentMethods.stripe,
        userId: userId ? String(userId) : undefined,
        guestEmail: !userId ? addressData.email || "" : undefined,
        discountCode: discountCode || undefined,
        shipmentCost: shipmentCost,
      };

      console.log("Submitting order data to backend:", orderData);
      const response = await axiosInstance.post(`/orders`, orderData, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
        withCredentials: true,
      });

      return response.data as { id: string };
    } catch (error) {
      // Error handling (unchanged)
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        const errorMessage =
          axiosError.response?.data?.message || "Order submission failed";
        setPaymentError(errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }
  };

  const validateForm = (): { isValid: boolean; firstErrorField?: string } => {
    const requiredFields = {
      firstName: t("validation.firstName"),
      lastName: t("validation.lastName"),
      email: t("validation.email"),
      phone: t("validation.phone"),
      street: t("validation.street"),
      houseNumber: t("validation.houseNumber"),
      zipCode: t("validation.zipCode"),
      city: t("validation.city"),
    };

    const errors: Record<string, string> = {};
    let hasErrors = false;
    let firstErrorField = "";

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!addressData[field as keyof typeof addressData]) {
        errors[field] = message;
        hasErrors = true;
        if (!firstErrorField) {
          firstErrorField = field;
        }
      }
    });

    // AGB validation
    if (!agbAccepted) {
      errors.agb = t("agbRequired");
      hasErrors = true;
      if (!firstErrorField) {
        firstErrorField = "agb";
      }
    }

    setFieldErrors(errors); // Set the errors in parent component

    return { isValid: !hasErrors, firstErrorField };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors

    // Prevent double submission
    if (processing) {
      console.warn("Payment already in progress");
      return;
    }

    const validationResult = validateForm();
    if (!validationResult.isValid) {
      // Scroll to the first error field specifically
      if (validationResult.firstErrorField) {
        scrollToFirstError(validationResult.firstErrorField);
      }
      return;
    }

    setProcessing(true);
    try {
      // Update user address if userId is available
      if (userId) {
        const accessToken = storage.getItem("access_token");
        await axiosInstance.patch(`/users/me`, addressData, {
          headers: {
            "X-CSRF-Token": csrfToken,
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          withCredentials: true,
        });
      }

      // Post order data to backend
      const orderResult = await submitOrderToBackend();

      if (!orderResult) {
        setErrorMessage(t("orderCreationFailed") || "Failed to create order");
        setShowErrorModal(true);
        setProcessing(false);
        return;
      }

      // Create metadata for the order
      const metadata = {
        orderId: orderResult.id || "",
        customerName: `${addressData.firstName} ${addressData.lastName}`,
        customerEmail: addressData.email || "",
      };

      // Prepare line items for Stripe with actual product names and prices
      const lineItems = items.map((item) => {
        let name = "Unknown Item";
        let unitPrice = 0;
        
        if (item.type === "part" && item.part) {
          // Get part name from translations
          const partTranslation = item.part.translations?.find(
            (t: { language: string }) => t.language === locale
          ) || item.part.translations?.[0];
          name = partTranslation?.title || "Part";
          // Use the base price from the part
          unitPrice = parseFloat(item.part.price || "0");
          
          // Add customization price adjustments using part schema as source of truth
          if (item.customizationOptions?.options?.length) {
            let partSchema = item.part.customizationOptions as any;
            if (typeof partSchema === "string") {
              try { partSchema = JSON.parse(partSchema); } catch { partSchema = null; }
            }
            const schemaOptions: any[] = partSchema?.options || [];

            item.customizationOptions.options.forEach((option) => {
              const schemaOpt = schemaOptions.find(
                (so) =>
                  so.type === option.type &&
                  so.translations?.en?.title === option.translations?.en?.title,
              );
              const optAdj =
                schemaOpt?.priceAdjustment ??
                ("priceAdjustment" in option ? (option as any).priceAdjustment : 0) ??
                0;
              if (optAdj) unitPrice += optAdj;

              if (option.type === "dropdown") {
                const selectedVal =
                  "selectedValue" in option
                    ? (option as any).selectedValue
                    : "value" in option
                      ? (option as any).value
                      : null;
                if (selectedVal) {
                  const itemsList: any[] = schemaOpt?.items || (option as any).items || [];
                  const selItem = itemsList.find((i: any) => i.id === selectedVal);
                  if (selItem?.priceAdjustment) unitPrice += selItem.priceAdjustment;
                }
              }
            });
          }
        } else if (item.type === "powdercoat" && item.powdercoatService) {
          name = item.powdercoatService.name || "Powdercoat Service";
          const price = item.powdercoatService.price;
          unitPrice = typeof price === "string" ? parseFloat(price) : price;
        } else if (item.sticker) {
          // For stickers, get the name from translations if available
          if ("translations" in item.sticker && item.sticker.translations?.length > 0) {
            const stickerTranslation = item.sticker.translations.find(
              (t: { language: string }) => t.language === locale
            ) || item.sticker.translations[0];
            name = stickerTranslation?.title || "Sticker";
          } else {
            name = "Custom Sticker";
          }
          
          // Calculate sticker price
          const pricePerCm2 = item.vinyl
            ? parseFloat(
                typeof item.sticker.pricePerCm2Vinyl === "string"
                  ? item.sticker.pricePerCm2Vinyl
                  : String(item.sticker.pricePerCm2Vinyl || "0")
              )
            : parseFloat(
                typeof item.sticker.pricePerCm2Printable === "string"
                  ? item.sticker.pricePerCm2Printable
                  : String(item.sticker.pricePerCm2Printable || "0")
              );
          
          const areaPrice = (item.width || 0) * (item.height || 0) * pricePerCm2;
          unitPrice = areaPrice; // Base unit price without additional price
        }
        
        return {
          name,
          quantity: item.amount,
          unitPrice,
        };
      });

      // Create Stripe Checkout Session
      const checkoutResponse = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalTotal,
          customerEmail: addressData.email,
          locale: locale,
          discountCode: discountCode || undefined,
          metadata: metadata,
          lineItems: lineItems,
          shipmentCost: shipmentCost,
        }),
      });

      if (!checkoutResponse.ok) {
        setErrorMessage(
          t("checkoutSessionFailed") || "Failed to create checkout session",
        );
        setShowErrorModal(true);
        setProcessing(false);
        return;
      }

      const { url } = await checkoutResponse.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        setErrorMessage(
          t("checkoutRedirectFailed") || "Failed to redirect to checkout",
        );
        setShowErrorModal(true);
        setProcessing(false);
      }
    } catch (error) {
      console.error("Exception during checkout:", error);

      // Try to extract a more specific error message
      let errorMsg = t("unexpectedError") || "An unexpected error occurred";
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (error && typeof error === "object" && "message" in error) {
        errorMsg = String(error.message);
      }

      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {fieldErrors.payment && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700/40">
          <p className="text-red-400 text-sm">{fieldErrors.payment}</p>
        </div>
      )}

      <AGBCheckbox
        agbAccepted={agbAccepted}
        setAgbAccepted={setAgbAccepted}
        fieldErrors={fieldErrors}
        locale={locale}
      />

      <button
        type="submit"
        disabled={processing || isCalculating}
        className="mt-6 w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 py-4 px-6 font-bold text-sm uppercase tracking-widest transition-colors duration-200 disabled:cursor-not-allowed group relative overflow-hidden"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="relative flex items-center justify-center gap-2">
          {processing ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              {t("processing")}
            </>
          ) : isCalculating ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              {t("calculatingPrice") || "Calculating price..."}
            </>
          ) : (
            <>
              {t("proceedToPayment") || t("completePayment") || t("payNow")}
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </span>
      </button>

      {/* Reassurance Messages Below Button */}
      <div className="mt-4 space-y-2 text-center text-xs xxs:text-sm">
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <span>✅</span>
          <span className="font-medium">{t("reassurance.securePayment")}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <span>📧</span>
          <span>{t("reassurance.orderEmail")}</span>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3
                className="text-lg sm:text-xl font-bold uppercase tracking-wide text-red-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("errors.paymentFailed")}
              </h3>
            </div>
            <p className="mb-6 text-sm sm:text-base text-zinc-300 leading-relaxed">
              {errorMessage}
            </p>

            {/* Help Section */}
            <div className="bg-zinc-800 border border-zinc-700 p-4 mb-6">
              <p
                className="text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-400 mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                💡 What you can do:
              </p>
              <ul className="text-xs sm:text-sm text-zinc-400 space-y-1">
                <li>• Check your card details are correct</li>
                <li>• Ensure you have sufficient funds</li>
                <li>• Try a different payment method</li>
              </ul>
            </div>

            {/* Support Message */}
            <p className="text-xs text-zinc-600 mb-6 text-center">
              Need help? Contact our support team at support@revsticks.com
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold uppercase tracking-widest text-sm transition-colors duration-200"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Try Again
              </button>
              <a
                href="https://wa.me/41795014987"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default function CheckoutPage() {
  const { items } = useCart();

  // Memoize parsed items to prevent infinite re-renders
  const parsedItems = useMemo(() => {
    return items.map((item) => {
      if (item.type === "part" && item.part) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedOptions: any = item.part.customizationOptions;

        // Check if customizationOptions is a string and parse it
        if (typeof item.part.customizationOptions === "string") {
          try {
            parsedOptions = JSON.parse(item.part.customizationOptions);
          } catch (error) {
            console.error(
              "Failed to parse part customizationOptions in checkout:",
              error,
            );
            parsedOptions = undefined;
          }
        }

        return {
          ...item,
          part: {
            ...item.part,
            customizationOptions: parsedOptions,
          },
        };
      }
      return item;
    });
  }, [items]);

  const [priceCalculation, setPriceCalculation] =
    useState<PriceCalculationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const { csrfToken } = useCsrfToken();
  const [addressData, setAddressData] = useState<Partial<CreateStickerOrder>>(
    {},
  );
  const [debouncedAddressData, setDebouncedAddressData] = useState<
    Partial<CreateStickerOrder>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<DiscountResponse | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountHint, setDiscountHint] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const params = useParams();
  const locale = params.locale as string;

  const t = useTranslations("checkout");

  const axiosInstance = useAxios();

  // Function to determine which shipping label to show based on cart contents
  const getShippingLabel = () => {
    const hasPowdercoatService = parsedItems.some(
      (item) => item.type === "powdercoat" && item.powdercoatService,
    );
    const hasOtherItems = parsedItems.some(
      (item) => item.type !== "powdercoat",
    );

    if (hasPowdercoatService && hasOtherItems) {
      return t("returnShippingAndShipping");
    } else if (hasPowdercoatService) {
      return t("returnShipping");
    } else {
      return t("shipping");
    }
  };

  // Add function to calculate prices via backend API
  const calculatePrices = async (
    appliedDiscountCode?: string,
    addressData?: Partial<CreateStickerOrder>,
  ) => {
    if (parsedItems.length === 0) {
      setPriceCalculation(null);
      return;
    }

    try {
      setIsCalculating(true);
      setCalculationError("");

      // Separate stickers, parts, and powdercoat services into their respective arrays
      const stickerItems = [];
      const partItems = [];
      const powdercoatServiceItems = [];

      // Process each item in the cart
      for (const item of parsedItems) {
        if (item.type === "part" && item.part) {
          // Parse the part schema for reliable priceAdjustment lookups
          let partSchema: { options: Array<{ type: string; priceAdjustment?: number; items?: Array<{ id: string; priceAdjustment?: number }> }> } | null = null;
          try {
            const raw = item.part.customizationOptions;
            partSchema = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof partSchema);
          } catch { /* ignore */ }

          // Part items go to partOrderItems array
          partItems.push({
            partId: item.part.id,
            quantity: item.amount,
            customizationOptions:
              item.customizationOptions?.options?.map((option) => {
                // Use the part's full schema as the source of truth for price adjustments
                let partSchema = item.part!.customizationOptions as any;
                if (typeof partSchema === "string") {
                  try { partSchema = JSON.parse(partSchema); } catch { partSchema = null; }
                }
                const schemaOptions: any[] = partSchema?.options || [];
                const schemaOpt = schemaOptions.find(
                  (so) =>
                    so.type === option.type &&
                    so.translations?.en?.title === option.translations?.en?.title,
                );

                const selectedVal =
                  "selectedValue" in option
                    ? String(option.selectedValue ?? "")
                    : "value" in option
                      ? String(option.value ?? "")
                      : "";

                const optAdj =
                  schemaOpt?.priceAdjustment ??
                  ("priceAdjustment" in option ? (option as any).priceAdjustment : undefined);

                let selectedItemPriceAdjustment: number | undefined;
                if (option.type === "dropdown" && selectedVal) {
                  const itemsList: any[] = schemaOpt?.items || (option as any).items || [];
                  const selItem = itemsList.find((i: any) => i.id === selectedVal);
                  selectedItemPriceAdjustment = selItem?.priceAdjustment;
                }

                return {
                  type: option.type,
                  value: selectedVal,
                  optionId: option.translations.en.title,
                  ...(optAdj != null && optAdj !== 0 ? { priceAdjustment: optAdj } : {}),
                  ...(selectedItemPriceAdjustment != null
                    ? { selectedItemPriceAdjustment }
                    : {}),
                };
              }) || [],
          });
        } else if (item.type === "powdercoat" && item.powdercoatService) {
          // Powdercoat service items go to powdercoatServiceOrderItems array
          powdercoatServiceItems.push({
            powdercoatingServiceId: item.powdercoatService.id,
            quantity: item.amount,
            color: item.powdercoatColorId || item.color || "", // Always include color field
          });
        } else if (item.sticker) {
          // Sticker items go to orderItems array
          stickerItems.push({
            stickerId: item.sticker.id,
            quantity: item.amount,
            width: item.width || 0,
            height: item.height || 0,
            vinyl: item.vinyl || false,
            printed: item.printed || false,
            customizationOptions:
              item.customizationOptions?.options?.map((option) => ({
                type: option.type,
                value:
                  "selectedValue" in option
                    ? String(option.selectedValue ?? "")
                    : "value" in option
                      ? String(option.value ?? "")
                      : "",
                optionId: option.translations.en.title,
              })) || [],
          });
        }
      }

      const requestData = {
        orderItems: stickerItems,
        partOrderItems: partItems,
        powdercoatServiceOrderItems: powdercoatServiceItems,
        discountCode: appliedDiscountCode || undefined,
        shippingAddress: addressData
          ? {
              country: addressData.country || "CH",
              city: addressData.city || "",
              zipCode: addressData.zipCode || "",
              street: addressData.street || "",
            }
          : undefined,
      };

      console.log("Calculating prices with data:", requestData);

      const response = await axiosInstance.post<PriceCalculationResponse>(
        "/orders/calculate-price",
        requestData,
      );

      setPriceCalculation(response.data);

      // Update final total based on the calculation from backend
      if (response.data) {
        setFinalTotal(response.data.totalPrice);
      }
    } catch (error: unknown) {
      console.error("Error calculating prices:", error);
      setCalculationError(t("errors.calculationError"));
    } finally {
      setIsCalculating(false);
    }
  };

  // Add state for final total to be used in payment intent
  const [finalTotal, setFinalTotal] = useState(0);

  // Debounce address data changes for price calculation
  useEffect(() => {
    setIsCalculating(true); // Immediately mark as calculating so button is disabled
    const timeoutId = setTimeout(() => {
      setDebouncedAddressData(addressData);
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [addressData]);

  // Call the API when items or discount changes, or when debounced address changes
  useEffect(() => {
    setIsCalculating(true); // Immediately disable button when any price-affecting input changes
    calculatePrices(discount ? discountCode : undefined, debouncedAddressData);

    // Check discount benefit when items or discount changes
    if (discount) {
      checkDiscountBenefit(discount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedItems, discount, debouncedAddressData]);

  // Function to check if discount code provides any benefit for items with initial pricing
  const checkDiscountBenefit = (discountData: DiscountResponse) => {
    if (discountData.type !== "percentage") return;

    const discountPercentage = parseFloat(discountData.value);
    let hasItemsWithBetterInitialPrice = false;

    parsedItems.forEach((item) => {
      if (item.type === "part" && item.part) {
        const regularPrice = parseFloat(item.part.price || "0");
        const initialPrice =
          item.part.initialPrice && item.part.initialPrice.trim() !== ""
            ? parseFloat(item.part.initialPrice)
            : null;

        if (initialPrice !== null && initialPrice > 0) {
          const percentageDifference = Math.abs(
            ((initialPrice - regularPrice) / regularPrice) * 100,
          );

          // If initial price has better discount than code
          if (percentageDifference > discountPercentage) {
            hasItemsWithBetterInitialPrice = true;
          }
        }
      }
    });

    if (hasItemsWithBetterInitialPrice) {
      setDiscountHint(t("discountHints.initialPriceWarning"));
    } else {
      setDiscountHint("");
    }
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim() || !csrfToken) return;

    setIsValidatingCode(true);
    setDiscountError("");
    setDiscountHint("");

    // Create timeout for discount validation (10 seconds)
    const timeoutId = setTimeout(() => {
      setIsValidatingCode(false);
      setDiscountError(
        t("errors.validationTimeout") ||
          "Validation timed out. Please try again.",
      );
    }, 10000);

    try {
      const response = await axiosInstance.get<DiscountResponse>(
        `/discounts/validate/${discountCode}`,
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
          timeout: 10000, // 10 second timeout
        },
      );

      clearTimeout(timeoutId);
      setDiscount(response.data);
      checkDiscountBenefit(response.data);
    } catch (error) {
      clearTimeout(timeoutId);
      setDiscount(null);
      setDiscountHint("");
      if (error && typeof error === "object" && "response" in error) {
        setDiscountError(t("errors.invalidCode"));
      } else {
        setDiscountError(t("errors.validationFailed"));
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleAddressChange = (newData: Partial<CreateStickerOrder>) => {
    setAddressData((prev) => ({ ...prev, ...newData }));
  };

  // Helper function to calculate part price for display (shows appropriate base price based on discount logic)
  const calculatePartPriceForDisplay = (item: CartItem) => {
    if (item.type !== "part" || !item.part) return 0;

    const regularPrice = parseFloat(item.part.price || "0");
    const initialPrice =
      item.part.initialPrice && item.part.initialPrice.trim() !== ""
        ? parseFloat(item.part.initialPrice)
        : null;

    let basePrice = regularPrice;

    // Check if we should display initial price based on discount code logic
    if (
      initialPrice !== null &&
      initialPrice > 0 &&
      discount?.type === "percentage"
    ) {
      // Calculate percentage difference between initial and regular price
      const percentageDifference = Math.abs(
        ((initialPrice - regularPrice) / regularPrice) * 100,
      );
      const discountPercentage = parseFloat(discount.value);

      // If the difference between price and initial price is higher than discount code percentage,
      // show the regular price. Otherwise, show the initial price.
      if (percentageDifference <= discountPercentage) {
        basePrice = initialPrice;
      } else {
        basePrice = regularPrice;
      }
    }

    // Parse the part schema for reliable priceAdjustment lookups
    let partSchema: { options: Array<{ type: string; priceAdjustment?: number; items?: Array<{ id: string; priceAdjustment?: number }> }> } | null = null;
    try {
      const raw = item.part.customizationOptions;
      partSchema = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof partSchema);
    } catch { /* ignore */ }

    // Add price adjustments from customization options
    if (item.customizationOptions?.options?.length) {
      // Use the part's full schema as the source of truth for price adjustments
      let partSchema = item.part.customizationOptions as any;
      if (typeof partSchema === "string") {
        try { partSchema = JSON.parse(partSchema); } catch { partSchema = null; }
      }
      const schemaOptions: any[] = partSchema?.options || [];

      item.customizationOptions.options.forEach((option) => {
        // Find matching option in part schema by type + English title
        const schemaOpt = schemaOptions.find(
          (so) =>
            so.type === option.type &&
            so.translations?.en?.title === option.translations?.en?.title,
        );

        // Option-level price adjustment (prefer schema, fallback to stored)
        const optAdj =
          schemaOpt?.priceAdjustment ??
          ("priceAdjustment" in option ? (option as any).priceAdjustment : 0) ??
          0;
        if (optAdj) basePrice += optAdj;

        // For dropdown: find the selected item's price adjustment
        if (option.type === "dropdown") {
          const selectedVal =
            "selectedValue" in option
              ? (option as any).selectedValue
              : "value" in option
                ? (option as any).value
                : null;
          if (selectedVal) {
            const itemsList: any[] =
              schemaOpt?.items || (option as any).items || [];
            const selItem = itemsList.find((i: any) => i.id === selectedVal);
            if (selItem?.priceAdjustment) basePrice += selItem.priceAdjustment;
          }
        }
      });
    }

    return basePrice * item.amount;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = storage.getItem("access_token");

      if (!accessToken) {
        return;
      }

      try {
        const response = await axiosInstance.get<UserApiResponse>(`/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
          timeout: 10000, // 10 second timeout
        });

        const userData = response.data.data;
        setUserId(userData.id);

        const addressData: UserAddressData = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          street: userData.street,
          houseNumber: userData.houseNumber,
          zipCode: userData.zipCode,
          city: userData.city,
          additionalAddressInfo: userData.additionalAddressInfo,
        };

        setAddressData(addressData);
      } catch (error) {
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { data?: { message?: string } };
          };
          console.error("API Error:", axiosError.response?.data);
          // If user fetch fails, user can still proceed as guest
          console.log("Proceeding as guest user");
        }
      }
    };

    if (csrfToken) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrfToken]); // Add csrfToken to dependency array

  return (
    <div
      className={`${oswald.variable} ${dmSans.variable} min-h-screen w-full bg-zinc-950`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        {/* Page Header */}
        <div className="border-b border-zinc-800 pb-8 mb-8">
          <p
            className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="h-px w-8 bg-amber-400" />
            Checkout
          </p>
          <h1
            className="mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("completeOrder")}
          </h1>
          {/* Step progress */}
          <div className="mt-4 flex items-center gap-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-amber-500 text-zinc-950 text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>1</span>
              <span className="text-xs uppercase tracking-widest text-zinc-400 hidden sm:block" style={{ fontFamily: "var(--font-display)" }}>{t("reviewItems")}</span>
            </div>
            <span className="h-px w-6 sm:w-10 bg-zinc-700 mx-2" />
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-amber-500 text-zinc-950 text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>2</span>
              <span className="text-xs uppercase tracking-widest text-zinc-400 hidden sm:block" style={{ fontFamily: "var(--font-display)" }}>{t("enterAddress")}</span>
            </div>
            <span className="h-px w-6 sm:w-10 bg-zinc-700 mx-2" />
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 bg-amber-500 text-zinc-950 text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>3</span>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold hidden sm:block" style={{ fontFamily: "var(--font-display)" }}>{t("completePaymentStep")}</span>
            </div>
          </div>
        </div>

        {/* Order Overview Section */}
        <div className="border border-zinc-800 mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900">
            <h2
              className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("orderOverview")}
              <span className="ml-2 text-amber-400">— {items.length} {items.length === 1 ? "item" : "items"}</span>
            </h2>
            {items.length > 3 && (
              <button
                onClick={() => setIsCartExpanded(!isCartExpanded)}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-center mt-2 sm:mt-0"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="text-xs uppercase tracking-widest">
                  {isCartExpanded ? t("showLess") : t("showAll")}
                </span>
                {isCartExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-800/60 bg-zinc-950">
            {/* Pre-order notice */}
            {parsedItems.some(
              (item) =>
                item.type === "part" &&
                item.part &&
                (Array.isArray(item.part.shippingReady)
                  ? item.part.shippingReady[0]
                  : item.part.shippingReady) === "pre_order",
            ) && (
              <div className="flex items-start gap-3 border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
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
                <span>{t("preOrderCheckoutNotice")}</span>
              </div>
            )}

            {(items.length <= 3 || isCartExpanded
              ? items
              : items.slice(0, 3)
            ).map((item) => (
              <div
                key={
                  item.type === "part"
                    ? `part-${item.part?.id}`
                    : item.type === "powdercoat"
                      ? `powdercoat-${item.powdercoatService?.id}`
                      : `sticker-${item.sticker?.id}`
                }
                className="flex flex-col sm:flex-row sm:justify-between px-4 sm:px-6 py-4 gap-3 sm:gap-0"
              >
                <div className="flex gap-3 sm:gap-4 flex-1">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 border border-zinc-700">
                    {/* Part image */}
                    {item.type === "part" && item.part ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={
                            item.part.images && item.part.images.length > 0
                              ? item.part.images[0].startsWith("http")
                                ? item.part.images[0]
                                : `https://minio-api.cwx-dev.com/parts/${item.part.images[0]}`
                              : "/512x512.png"
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
                          unoptimized={true}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/512x512.png";
                          }}
                        />
                      </div>
                    ) : item.type === "powdercoat" && item.powdercoatService ? (
                      /* Powdercoat service image */
                      <Image
                        src={
                          item.powdercoatService.images &&
                          item.powdercoatService.images.length > 0
                            ? item.powdercoatService.images[0].startsWith(
                                "http",
                              )
                              ? item.powdercoatService.images[0]
                              : `https://minio-api.cwx-dev.com/powdercoat-services/${item.powdercoatService.images[0]}`
                            : "/512x512.png"
                        }
                        alt={
                          item.powdercoatService.name || "Powdercoat Service"
                        }
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                    ) : item.sticker &&
                      !("images" in item.sticker) &&
                      "image" in item.sticker ? (
                      /* Custom sticker with direct image data */
                      <Image
                        src={item.sticker.image}
                        alt="Custom Sticker"
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                    ) : item.sticker &&
                      "images" in item.sticker &&
                      item.sticker.images?.length > 0 ? (
                      /* Regular sticker with images array */
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
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                    ) : (
                      /* Fallback for no image */
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-600">No Image</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {/* Item details - render differently based on type */}
                    {item.type === "part" && item.part ? (
                      /* Part details */
                      <>
                        <h3
                          className="font-bold text-sm sm:text-base uppercase tracking-wide text-zinc-200"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {item.part.translations.find(
                            (t: { language: string }) => t.language === locale,
                          )?.title ||
                            item.part.translations[0]?.title ||
                            "Part"}
                        </h3>
                        <p className="text-sm text-zinc-500">
                          {item.amount} {t("pieces")}
                        </p>
                      </>
                    ) : item.type === "powdercoat" && item.powdercoatService ? (
                      /* Powdercoat service details */
                      <>
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-bold text-sm sm:text-base uppercase tracking-wide text-zinc-200"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {item.powdercoatService.name ||
                              "Powdercoat Service"}
                          </h3>
                          <span
                            className="inline-block text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 uppercase tracking-wider"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {t("powdercoatBadge")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">
                          {item.amount} {t("pieces")}
                        </p>
                      </>
                    ) : (
                      /* Sticker details */
                      <>
                        <h3
                          className="font-bold text-sm sm:text-base uppercase tracking-wide text-zinc-200"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {item.sticker &&
                          "translations" in item.sticker &&
                          item.sticker.translations.length > 0
                            ? item.sticker.translations.find(
                                (t) => t.language === locale,
                              )?.title ||
                              item.sticker.translations[0]?.title ||
                              "Sticker"
                            : "Custom Sticker"}
                        </h3>
                        <p className="text-sm text-zinc-500">
                          {item.width?.toFixed(2)}cm x {item.height?.toFixed(2)}
                          cm • {item.amount} {t("pieces")}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {item.vinyl ? t("vinyl") : t("printable")}
                        </p>
                      </>
                    )}

                    {/* Customization options - works for both parts and stickers */}
                    {item.customizationOptions &&
                      item.customizationOptions.options &&
                      item.customizationOptions.options.length > 0 && (
                        <div className="mt-1">
                          {item.customizationOptions.options
                            .map((option, optIndex) => {
                              // Safely extract option title from translations with multi-locale fallback
                              const translations = option.translations as
                                | BaseCustomizationOption["translations"]
                                | Record<string, { title: string }>;
                              const optionTitle =
                                translations?.[
                                  locale as "en" | "de" | "fr" | "it"
                                ]?.title ||
                                translations?.en?.title ||
                                translations?.de?.title ||
                                translations?.fr?.title ||
                                translations?.it?.title ||
                                "Option";

                              const rawValue =
                                "selectedValue" in option
                                  ? option.selectedValue || ""
                                  : "value" in option
                                    ? option.value || ""
                                    : "";

                              // Don't show empty values
                              if (!rawValue) return null;

                              // For dropdown options, try to resolve the display value from part data
                              let displayValue = rawValue;
                              let resolvedTitle = optionTitle;

                              if (option.type === "dropdown") {
                                try {
                                  if (
                                    item.type === "part" &&
                                    item.part?.customizationOptions?.options
                                  ) {
                                    // Find the dropdown option definition in part data
                                    // Try case-insensitive match across all translation keys
                                    let dropdownOption =
                                      item.part.customizationOptions.options.find(
                                        (partOption) => {
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
                                    if (
                                      !dropdownOption &&
                                      item.part.customizationOptions.options
                                    ) {
                                      dropdownOption =
                                        item.part.customizationOptions.options.find(
                                          (partOption) =>
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
                                          ) => dropdownItem.id === rawValue,
                                        );

                                      if (selectedItem?.translations) {
                                        // Use the localized title or fall back to English
                                        displayValue =
                                          selectedItem.translations[
                                            locale as "en" | "de" | "fr" | "it"
                                          ]?.title ||
                                          selectedItem.translations.en?.title ||
                                          rawValue;
                                      }
                                    }
                                  } else if (
                                    item.sticker &&
                                    "translations" in item.sticker &&
                                    item.sticker.customizationOptions?.options
                                  ) {
                                    // Find the dropdown option definition in sticker data
                                    // Try case-insensitive match across all translation keys
                                    let dropdownOption =
                                      item.sticker.customizationOptions.options.find(
                                        (
                                          stickerOption: CustomizationOption,
                                        ) => {
                                          if (stickerOption.type !== "dropdown")
                                            return false;

                                          // Check all translation keys for a match
                                          const stickerTitles = [
                                            stickerOption.translations?.en
                                              ?.title,
                                            stickerOption.translations?.de
                                              ?.title,
                                            stickerOption.translations?.fr
                                              ?.title,
                                            stickerOption.translations?.it
                                              ?.title,
                                          ].filter(Boolean);

                                          return stickerTitles.some(
                                            (title) =>
                                              title?.toLowerCase() ===
                                              optionTitle?.toLowerCase(),
                                          );
                                        },
                                      ) as DropdownOption | undefined;

                                    // If still not found, just use the first dropdown option
                                    if (
                                      !dropdownOption &&
                                      item.sticker.customizationOptions.options
                                    ) {
                                      dropdownOption =
                                        item.sticker.customizationOptions.options.find(
                                          (
                                            stickerOption: CustomizationOption,
                                          ) =>
                                            stickerOption.type === "dropdown",
                                        ) as DropdownOption | undefined;
                                    }

                                    if (
                                      dropdownOption &&
                                      "items" in dropdownOption &&
                                      dropdownOption.items
                                    ) {
                                      // Update the option title to use the actual title from sticker data
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
                                          ) => dropdownItem.id === rawValue,
                                        );

                                      if (selectedItem?.translations) {
                                        // Use the localized title or fall back to English
                                        displayValue =
                                          selectedItem.translations[
                                            locale as "en" | "de" | "fr" | "it"
                                          ]?.title ||
                                          selectedItem.translations.en?.title ||
                                          rawValue;
                                      }
                                    }
                                  }
                                } catch {
                                  // Keep the raw value as fallback
                                }
                              }

                              return (
                                <p
                                  key={optIndex}
                                  className="text-sm text-zinc-500"
                                >
                                  {String(resolvedTitle)}:{" "}
                                  <span className="ml-1">
                                    {String(displayValue)}
                                  </span>
                                </p>
                              );
                            })
                            .filter(Boolean)}
                        </div>
                      )}
                  </div>
                </div>
                <div className="text-right sm:self-start self-end">
                  <p
                    className="font-bold text-lg sm:text-base text-amber-400"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    CHF{" "}
                    {(() => {
                      if (item.type === "part" && item.part) {
                        // Use the helper function to display base price without discount calculations
                        const totalItemPrice =
                          calculatePartPriceForDisplay(item);
                        return totalItemPrice.toFixed(2);
                      } else if (
                        item.type === "powdercoat" &&
                        item.powdercoatService
                      ) {
                        // Powdercoat service pricing calculation
                        const servicePrice =
                          Number(item.powdercoatService.price) || 0;
                        const totalItemPrice = servicePrice * item.amount;
                        return totalItemPrice.toFixed(2);
                      } else {
                        // Sticker pricing calculation
                        const pricePerCm2 = item.vinyl
                          ? parseFloat(
                              typeof item.sticker!.pricePerCm2Vinyl === "string"
                                ? item.sticker!.pricePerCm2Vinyl
                                : "0",
                            )
                          : parseFloat(
                              typeof item.sticker!.pricePerCm2Printable ===
                                "string"
                                ? item.sticker!.pricePerCm2Printable
                                : "0",
                            );

                        const additionalPrice = item.vinyl
                          ? priceSettings.additionalPriceVinyl
                          : priceSettings.additionalPricePrintable;

                        const areaPrice =
                          (item.width || 0) * (item.height || 0) * pricePerCm2;
                        const baseItemPrice = areaPrice + additionalPrice;
                        const totalItemPrice = baseItemPrice * item.amount;

                        return totalItemPrice.toFixed(2);
                      }
                    })()}
                  </p>
                </div>
              </div>
            ))}

            {/* Show remaining items indicator when cart is collapsed */}
            {items.length > 3 && !isCartExpanded && (
              <div className="px-4 sm:px-6">
                <button
                  onClick={() => setIsCartExpanded(true)}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 w-full py-3 transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  + {items.length - 3} {t("moreItems")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Subtotal, Shipping, Total */}
            <div className="px-4 sm:px-6 pt-4 pb-5 space-y-2.5 min-h-[120px] bg-zinc-900">
              {isCalculating && priceCalculation ? (
                <div className="space-y-2 opacity-40 pointer-events-none">
                  {/* Show the previous calculation with reduced opacity while recalculating */}
                  {priceCalculation.stickersPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("stickersSubtotal")}</span>
                      <span>
                        CHF {priceCalculation.stickersPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {priceCalculation.partsPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("partsSubtotal")}</span>
                      <span>CHF {priceCalculation.partsPrice.toFixed(2)}</span>
                    </div>
                  )}

                  {priceCalculation.powdercoatServicesPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("powdercoatServicesSubtotal")}</span>
                      <span>
                        CHF{" "}
                        {priceCalculation.powdercoatServicesPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {priceCalculation.discountPercentage > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t("discount")}</span>
                      <span>-{priceCalculation.discountPercentage}%</span>
                    </div>
                  )}

                  {priceCalculation.codeDiscount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t("codeDiscount")}</span>
                      <span>
                        -CHF {priceCalculation.codeDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-500">
                    <span>{getShippingLabel()}</span>
                    <span>
                      {priceCalculation.shipmentCost === 0
                        ? t("free")
                        : `CHF ${priceCalculation.shipmentCost.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-zinc-700">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>{t("total")}</span>
                    <span className="text-2xl font-bold text-amber-400" style={{ fontFamily: "var(--font-display)" }}>CHF {priceCalculation.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ) : isCalculating ? (
                <div className="space-y-2 opacity-50">
                  {/* Skeleton loaders for initial load */}
                  <div className="flex justify-between">
                    <div className="h-5 bg-zinc-800 w-32 animate-pulse"></div>
                    <div className="h-5 bg-zinc-800 w-20 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-5 bg-zinc-800 w-24 animate-pulse"></div>
                    <div className="h-5 bg-zinc-800 w-16 animate-pulse"></div>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-3 border-t border-zinc-700">
                    <div className="h-6 bg-zinc-800 w-20 animate-pulse"></div>
                    <div className="h-6 bg-zinc-800 w-24 animate-pulse"></div>
                  </div>
                </div>
              ) : calculationError ? (
                <div className="text-red-400 text-sm">{calculationError}</div>
              ) : priceCalculation ? (
                <>
                  {/* Show stickers subtotal if there are any sticker items */}
                  {priceCalculation.stickersPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("stickersSubtotal")}</span>
                      <span>
                        CHF {priceCalculation.stickersPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Show parts subtotal if there are any part items */}
                  {priceCalculation.partsPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("partsSubtotal")}</span>
                      <span>CHF {priceCalculation.partsPrice.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Show powdercoat services subtotal if there are any powdercoat service items */}
                  {priceCalculation.powdercoatServicesPrice > 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t("powdercoatServicesSubtotal")}</span>
                      <span>
                        CHF{" "}
                        {priceCalculation.powdercoatServicesPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Percentage discount */}
                  {priceCalculation.discountPercentage > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t("discount")}</span>
                      <span>-{priceCalculation.discountPercentage}%</span>
                    </div>
                  )}

                  {/* Code discount */}
                  {priceCalculation.codeDiscount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t("codeDiscount")}</span>
                      <span>
                        -CHF {priceCalculation.codeDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Shipping */}
                  <div className="flex justify-between text-zinc-500">
                    <span>{getShippingLabel()}</span>
                    <span>
                      {priceCalculation.shipmentCost === 0
                        ? t("free")
                        : `CHF ${priceCalculation.shipmentCost.toFixed(2)}`}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-zinc-700">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>{t("total")}</span>
                    <span className="text-2xl font-bold text-amber-400" style={{ fontFamily: "var(--font-display)" }}>CHF {priceCalculation.totalPrice.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                // Fallback display
                <div className="text-center py-2 text-sm text-zinc-600">
                  {t("calculatingPrice")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
      {/* Discount Code Section */}
      <div className="border border-zinc-800 mb-8">
        <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400" style={{ fontFamily: "var(--font-display)" }}>Discount Code</p>
        </div>
        <div className="p-4 sm:p-6 bg-zinc-950 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder={t("enterDiscountCode")}
            className="flex-1 px-3 py-2.5 border border-zinc-700 bg-zinc-900 text-zinc-200 focus:outline-none focus:border-amber-500 min-w-0 text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
          />
          <button
            onClick={validateDiscountCode}
            disabled={!discountCode.trim() || isValidatingCode}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold uppercase tracking-widest text-xs transition-colors whitespace-nowrap sm:w-auto w-full"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isValidatingCode ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-zinc-950 mx-auto"></div>
            ) : (
              t("apply")
            )}
          </button>
        </div>
        {discountError && (
          <p className="text-xs text-red-400">{discountError}</p>
        )}
        {discountHint && (
          <p className="text-xs text-amber-400 bg-amber-500/10 p-3 border border-amber-500/20">
            💡 {discountHint}
          </p>
        )}
        </div>
      </div>
      <div className="mb-8 border border-zinc-800">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <span
            className="flex items-center justify-center w-7 h-7 bg-amber-500 text-zinc-950 font-bold text-xs shrink-0"
            style={{ fontFamily: "var(--font-display)" }}
          >
            2
          </span>
          <h2
            className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("shippingAddress")}
          </h2>
          <span
            className="text-xs font-bold px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-auto uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("takes1Minute")}
          </span>
        </div>
        <div className="p-4 sm:p-6 bg-zinc-950">
        <div className="border-l-2 border-amber-500/50 pl-3 mb-5">
          <p className="text-xs text-zinc-400">
            {t("autoFillAddressHint")}
          </p>
        </div>
        <AddressForm
          onAddressChange={handleAddressChange}
          fieldErrors={fieldErrors}
          defaultValues={addressData}
        />
        </div>
      </div>

      <div className="mb-8 border border-zinc-800">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <span
            className="flex items-center justify-center w-7 h-7 bg-amber-500 text-zinc-950 font-bold text-xs shrink-0"
            style={{ fontFamily: "var(--font-display)" }}
          >
            3
          </span>
          <h2
            className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("payment")}
          </h2>
        </div>
        <div className="p-4 sm:p-6 bg-zinc-950">
        <CheckoutForm
          addressData={addressData}
          setFieldErrors={setFieldErrors}
          paymentError={paymentError}
          setPaymentError={setPaymentError}
          fieldErrors={fieldErrors}
          userId={userId}
          csrfToken={csrfToken}
          discountCode={discountCode}
          finalTotal={finalTotal}
          shipmentCost={priceCalculation?.shipmentCost ?? 0}
          items={items}
          isCalculating={isCalculating}
        />
        </div>
      </div>
      <CheckoutWhatsAppButton paymentError={""} />
      </div>
    </div>
  );
}
