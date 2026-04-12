import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Download,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import storage from "@/lib/storage";
import { Tag, Search } from "lucide-react";
import { useEnv } from "@/context/EnvContext";
import useAxios from "@/useAxios";
import { CustomizationOption } from "@/types/sticker/customizazion.type";

// Types for orders data
export interface OrderItem {
  id: string;
  orderId: string;
  stickerId: string;
  customStickerId: string | null;
  width: string;
  height: string;
  vinyl: boolean;
  printed: boolean;
  customizationOptions: {
    type: string;
    value: string;
    optionId: number;
  }[];
  quantity: number;
  sticker?: {
    id: string;
    weight?: number;
    translations: {
      id: string;
      stickerId: string;
      language: string;
      title: string;
      description: string;
    }[];
    images: string[];
    [key: string]: unknown;
  };
  customSticker?: {
    id: string;
    image: string;
    [key: string]: unknown;
  } | null;
  processedImage?: string; // Processed image URL
}

export interface OrderPartItem {
  id: string;
  orderId: string;
  partId: string;
  customizationOptions: {
    type: string;
    value: string;
    optionId: string | number;
  }[];
  quantity: number;
  part?: {
    id: string;
    price: string;
    quantity: number;
    type?: string;
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
    customizationOptions: string; // JSON string
    images: string[];
    sold: number;
    sortingRank: number;
    active: boolean;
    createdAt: string;
    updatedAt: string | null;
    translations: {
      id: string;
      partId: string;
      language: string;
      title: string;
      description: string | null;
    }[];
  };
  processedImage?: string; // Processed image URL
}

export interface OrderPowdercoatItem {
  id: string;
  orderId: string;
  powdercoatingServiceId: string;
  color: string;
  customizationOptions: {
    type: string;
    value: string;
    optionId: string | number;
  }[];
  quantity: number;
  powdercoatingService?: {
    id: string;
    name: string;
    images: string[];
    description: string;
    price: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  processedImage?: string; // Processed image URL
}

export type CustomOption = {
  type: string;
  value: string;
  optionId: number | string;
};

interface DiscountDetails {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: string;
  active: boolean;
  validFrom: string;
  validUntil: string;
  usageCount: number;
  maxUsage: number;
  createdAt: string;
}

interface Order {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  additionalAddressInfo?: string;
  userId: string | null;
  guestEmail?: string;
  paymentMethod: string;
  orderDate: string;
  comment?: string;
  status: string;
  totalPrice: string;
  shipmentCost: string;
  discountId: string | null;
  discountCode?: string;
  paymentId: string | null;
  shipmentCarrier?: string | null;
  items: OrderItem[];
  partItems?: OrderPartItem[]; // Add part items
  powdercoatItems?: OrderPowdercoatItem[]; // Add powdercoat items
}

interface OrdersResponse {
  parsedOrders: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  CH: "Switzerland",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LI: "Liechtenstein",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MT: "Malta",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
};

interface Props {
  csrfToken: string;
}

// Define a type for dropdown items
export interface DropdownItem {
  id: string;
  translations: Record<string, { title: string }>;
}

const getFilamentColorLabel = (
  item: OrderItem | OrderPartItem,
  option: CustomOption,
): string => {
  const colorId = option.value;

  // Helper to extract options from customizationOptions (string or object)
  const extractOptions = (customizationOptions: unknown): CustomizationOption[] => {
    if (typeof customizationOptions === "string") {
      try {
        return JSON.parse(customizationOptions).options || [];
      } catch {
        return [];
      }
    }
    if (
      customizationOptions &&
      typeof customizationOptions === "object" &&
      "options" in customizationOptions
    ) {
      return (customizationOptions as { options: CustomizationOption[] }).options;
    }
    return [];
  };

  let options: CustomizationOption[] = [];
  if ("stickerId" in item && item.sticker?.customizationOptions) {
    options = extractOptions(item.sticker.customizationOptions);
  } else if ("partId" in item && item.part?.customizationOptions) {
    options = extractOptions(item.part.customizationOptions);
  }

  for (const opt of options) {
    if (opt.type === "filamentColor" && opt.colors) {
      const match = opt.colors.find((c) => c.id === colorId);
      if (match) return match.value;
    }
  }

  return colorId;
};

const getDropdownLabel = (
  item: OrderItem | OrderPartItem,
  option: CustomOption,
  locale: "de" | "en" | "fr" | "it" = "en",
) => {
  if (option.type !== "dropdown") {
    return option.value;
  }

  // Handle stickers
  if ("stickerId" in item && item.sticker?.customizationOptions) {
    try {
      // Handle case where customizationOptions is already an object (not a string)
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

      // Find the dropdown option with improved matching logic
      // Try case-insensitive match across all translation keys
      let dropdownOption = options.find((o: CustomizationOption) => {
        if (o.type !== "dropdown") return false;

        // Check all translation keys for a match
        const titles = [
          o.translations?.en?.title,
          o.translations?.de?.title,
          o.translations?.fr?.title,
          o.translations?.it?.title,
        ].filter(Boolean);

        // Compare with option.optionId (case-insensitive)
        return titles.some(
          (title) =>
            title?.toLowerCase() === String(option.optionId)?.toLowerCase(),
        );
      });

      // If still not found, just use the first dropdown option as fallback
      if (!dropdownOption) {
        dropdownOption = options.find(
          (o: CustomizationOption) => o.type === "dropdown",
        );
      }

      if (dropdownOption && dropdownOption.items) {
        // Find the selected item by its ID
        const selectedItem = (dropdownOption.items as DropdownItem[]).find(
          (i: DropdownItem) => i.id === option.value,
        );

        if (selectedItem && selectedItem.translations) {
          // Return the localized title or fall back to English
          return (
            selectedItem.translations[locale]?.title ||
            selectedItem.translations.en?.title ||
            selectedItem.translations["en"]?.title ||
            option.value
          );
        }
      }

      return option.value;
    } catch (error) {
      console.error("Error parsing sticker customization options:", error);
      return option.value;
    }
  }

  // Handle parts
  else if ("partId" in item && item.part?.customizationOptions) {
    try {
      const options = JSON.parse(item.part.customizationOptions).options;

      // Find the dropdown option with improved matching logic
      // Try case-insensitive match across all translation keys
      let dropdownOption = options.find((o: CustomizationOption) => {
        if (o.type !== "dropdown") return false;

        // Check all translation keys for a match
        const titles = [
          o.translations?.en?.title,
          o.translations?.de?.title,
          o.translations?.fr?.title,
          o.translations?.it?.title,
        ].filter(Boolean);

        // Compare with option.optionId (case-insensitive)
        return titles.some(
          (title) =>
            title?.toLowerCase() === String(option.optionId)?.toLowerCase(),
        );
      });

      // If still not found, just use the first dropdown option as fallback
      if (!dropdownOption) {
        dropdownOption = options.find(
          (o: CustomizationOption) => o.type === "dropdown",
        );
      }

      if (dropdownOption && dropdownOption.items) {
        // Find the selected item by its ID
        const selectedItem = dropdownOption.items.find(
          (i: DropdownItem) => i.id === option.value,
        );

        if (selectedItem && selectedItem.translations) {
          // Return the localized title or fall back to English
          return (
            selectedItem.translations[locale as "de" | "en" | "fr" | "it"]
              ?.title ||
            selectedItem.translations.en?.title ||
            selectedItem.translations["en"]?.title ||
            option.value
          );
        }
      }

      return option.value;
    } catch (error) {
      console.error("Error parsing part customization options:", error);
      return option.value;
    }
  }

  return option.value;
};

const Orders: React.FC<Props> = ({ csrfToken }) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [discountDetails, setDiscountDetails] = useState<
    Record<string, DiscountDetails>
  >({});
  const [loadingDiscounts, setLoadingDiscounts] = useState<
    Record<string, boolean>
  >({});
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>(
    {},
  );
  const [showCartTemp, setShowCartTemp] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<"all" | "pending" | "by-product">("pending");
  const [productFilter, setProductFilter] = useState<string>("");
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchMode = searchQuery.trim().length > 0;
  const axiosInstance = useAxios();

  const { BACKEND_URL } = useEnv();

  const fetchOrders = async (page: number, status?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (status) {
        params.append("status", status);
      }

      const response = await axiosInstance.get<OrdersResponse>(
        `${BACKEND_URL}/orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        },
      );

              console.log("Fetched orders data:", response.data);


      const processedOrders = processOrderImages(response.data.parsedOrders);
      setOrders(processedOrders);
      setTotalPages(response.data.meta.totalPages || 1);
      setCurrentPage(response.data.meta.page);
      setError(null);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);

      // Type guard for axios-like errors
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        setError(error.response.data.message);
      } else if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to fetch orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchOrders = async (query: string, page: number) => {
    try {
      setLoading(true);
      setSearchError(null);
      const params = new URLSearchParams();
      params.append("q", query);
      params.append("page", page.toString());
      params.append("limit", "10");

      const response = await axiosInstance.get<OrdersResponse>(
        `${BACKEND_URL}/orders/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        },
      );

      const processedOrders = processOrderImages(response.data.parsedOrders);
      setOrders(processedOrders);
      setTotalPages(response.data.meta.totalPages || 1);
      setCurrentPage(response.data.meta.page);
    } catch (err: unknown) {
      console.error("Error searching orders:", err);
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data &&
        typeof (err.response.data as { message: unknown }).message === "string"
      ) {
        setSearchError(
          (err.response.data as { message: string }).message,
        );
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: unknown }).code === "NETWORK_ERROR"
      ) {
        setSearchError("Network error. Please check your connection.");
      } else {
        setSearchError("Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountDetails = async (
    discountId: string,
  ): Promise<DiscountDetails | null> => {
    try {
      const response = await axiosInstance.get<DiscountDetails>(
        `${BACKEND_URL}/discounts/${discountId}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Error fetching discount details:", error);
      return null;
    }
  };

  // Process image URLs in orders
  const processOrderImages = (orders: Order[]): Order[] => {
    return orders.map((order) => {
      // Process sticker items
      const processedItems = order.items.map((item) => {
        let processedImage = "";

        if (item.sticker?.images && item.sticker.images.length > 0) {
          const image = item.sticker.images[0];
          processedImage = image.startsWith("http")
            ? image
            : `https://minio-api.cwx-dev.com/stickers/${image}`;
        } else if (item.customSticker?.image) {
          processedImage = item.customSticker.image;
        }

        return {
          ...item,
          processedImage,
        };
      });

      // Process part items if they exist
      const processedPartItems =
        order.partItems?.map((item) => {
          let processedImage = "";

          if (item.part?.images && item.part.images.length > 0) {
            const image = item.part.images[0];
            processedImage = image.startsWith("http")
              ? image
              : `https://minio-api.cwx-dev.com/parts/${image}`;
          }

          return {
            ...item,
            processedImage,
          };
        }) || [];

      // Process powdercoat items if they exist
      const processedPowdercoatItems =
        order.powdercoatItems?.map((item) => {
          let processedImage = "";

          if (
            item.powdercoatingService?.images &&
            item.powdercoatingService.images.length > 0
          ) {
            const image = item.powdercoatingService.images[0];
            processedImage = image.startsWith("http")
              ? image
              : `https://minio-api.cwx-dev.com/powdercoat-services/${image}`;
          }

          return {
            ...item,
            processedImage,
          };
        }) || [];

      return {
        ...order,
        items: processedItems,
        partItems: processedPartItems,
        powdercoatItems: processedPowdercoatItems,
      };
    });
  };

  // Build unique product list whenever orders change
  useEffect(() => {
    const productSet = new Set<string>();
    for (const order of orders) {
      for (const name of getOrderProductNames(order)) {
        productSet.add(name);
      }
    }
    setAvailableProducts(Array.from(productSet).sort((a, b) => a.localeCompare(b)));
  }, [orders]);

  useEffect(() => {
    if (isSearchMode) return;
    // When switching to pending section, automatically filter by pending status
    const effectiveStatusFilter = activeSection === "pending" ? "pending" : statusFilter;
    fetchOrders(currentPage, effectiveStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, csrfToken, activeSection, searchQuery]);

  // Close product dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const toggleOrderExpansion = async (orderId: string) => {
    const newExpandedOrders = new Set(expandedOrders);

    if (newExpandedOrders.has(orderId)) {
      newExpandedOrders.delete(orderId);
    } else {
      newExpandedOrders.add(orderId);

      // Fetch discount details when expanding an order with discountId
      const order = orders.find((o) => o.id === orderId);
      if (
        order?.discountId &&
        !discountDetails[order.discountId] &&
        !loadingDiscounts[order.discountId]
      ) {
        setLoadingDiscounts((prev) => ({ ...prev, [order.discountId!]: true }));

        try {
          const details = await fetchDiscountDetails(order.discountId);
          if (details && typeof details === "object" && "id" in details) {
            setDiscountDetails((prev) => ({
              ...prev,
              [order.discountId!]: details as DiscountDetails,
            }));
          }
        } finally {
          setLoadingDiscounts((prev) => ({
            ...prev,
            [order.discountId!]: false,
          }));
        }
      }
    }

    setExpandedOrders(newExpandedOrders);
  };

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSectionChange = (section: "all" | "pending" | "by-product") => {
    setActiveSection(section);
    setCurrentPage(1);
    setSearchQuery("");
    setSearchError(null);
    setProductFilter("");
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    // Reset status filter when switching away from "all" section
    if (section !== "all") {
      setStatusFilter("");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchError(null);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (query.trim().length > 0) {
      searchDebounceRef.current = setTimeout(() => {
        void fetchSearchOrders(query.trim(), 1);
      }, 300);
    } else {
      setCurrentPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      if (isSearchMode) {
        void fetchSearchOrders(searchQuery.trim(), newPage);
      } else {
        setCurrentPage(newPage);
      }
    }
  };

  const renderDiscountInfo = (order: Order) => {
    if (!order.discountId) return null;

    const discount = discountDetails[order.discountId];
    const isLoading = loadingDiscounts[order.discountId];

    return (
      <div className="border-t border-zinc-700 mt-2 pt-2">
        <p className="font-medium flex items-center gap-1">
          <Tag className="h-4 w-4 text-amber-400" />
          Discount Information
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-1">
            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-amber-500"></div>
            <span className="text-sm text-zinc-400">
              Loading discount details...
            </span>
          </div>
        ) : discount ? (
          <div className="space-y-1 mt-1">
            <div className="flex items-center">
              <span className="text-amber-300 font-medium mr-2">Code:</span>
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                {discount.code}
              </span>
            </div>
            <p className="text-sm">
              <span className="text-zinc-400">Type:</span>{" "}
              {discount.type === "percentage"
                ? `${discount.value}% off`
                : `CHF ${(parseFloat(discount.value) || 0).toFixed(2)} off`}
            </p>
            <p className="text-sm">
              <span className="text-zinc-400">Valid period:</span>{" "}
              {new Date(discount.validFrom).toLocaleDateString()} -{" "}
              {new Date(discount.validUntil).toLocaleDateString()}
            </p>
            <p className="text-sm">
              <span className="text-zinc-400">Usage:</span>{" "}
              {discount.usageCount}/{discount.maxUsage}
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-400 py-1">
            Discount applied (Code: {order.discountCode || "N/A"})
          </p>
        )}
      </div>
    );
  };

  const getOrderStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-amber-500/20 text-amber-300";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "stand":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "cart_temp":
        return "bg-zinc-800 text-zinc-400";
      default:
        return "bg-zinc-800 text-zinc-200";
    }
  };

  // Helper to get product names from an order
  const getOrderProductNames = (order: Order): string[] => {
    const names: string[] = [];
    for (const item of order.items) {
      if (item.sticker?.translations?.length) {
        names.push(...item.sticker.translations.map((t) => t.title));
      }
      if (item.customSticker) {
        names.push("Custom Sticker");
      }
    }
    for (const item of order.partItems || []) {
      if (item.part?.translations?.length) {
        names.push(...item.part.translations.map((t) => t.title));
      }
    }
    for (const item of order.powdercoatItems || []) {
      if (item.powdercoatingService?.name) {
        names.push(item.powdercoatingService.name);
      }
    }
    return names;
  };

  // Filter orders based on showCartTemp toggle and product filter (by-product tab)
  const filteredOrders = orders.filter((order) => {
    if (!showCartTemp && order.status.toLowerCase() === "cart_temp") {
      return false;
    }
    if (activeSection === "by-product" && productFilter) {
      const names = getOrderProductNames(order);
      if (!names.some((name) => name === productFilter)) {
        return false;
      }
    }
    return true;
  });

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));

      await axiosInstance.patch(
        `${BACKEND_URL}/orders/${orderId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        },
      );

      // Update the order status in the local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );

      console.log("Order status updated successfully");
    } catch (error: unknown) {
      console.error("Error updating order status:", error);

      // Type guard for axios-like errors
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        alert(`Failed to update order status: ${error.response.data.message}`);
      } else {
        alert("Failed to update order status");
      }
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    if (
      window.confirm(
        `Are you sure you want to change the order status to "${newStatus}"?`,
      )
    ) {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const downloadInvoicePDF = async (order: Order) => {
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/orders/${order.id}/invoice`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
          responseType: "blob",
        },
      );

      // Extract filename from Content-Disposition header or use a fallback
      const contentDisposition = response.headers["content-disposition"] as
        | string
        | undefined;
      let filename = `Invoice_RevSticks_${order.id
        .substring(0, 8)
        .toUpperCase()}_${
        new Date(order.orderDate).toISOString().split("T")[0]
      }.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const blob = new Blob([response.data as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error("Error downloading invoice PDF:", error);
      alert("Failed to download invoice PDF. Please try again.");
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Section Tabs */}
      <div className="mb-6">
        <div className="border-b border-zinc-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleSectionChange("all")}
              className={`${
                activeSection === "all"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              All Orders
            </button>
            <button
              onClick={() => handleSectionChange("pending")}
              className={`${
                activeSection === "pending"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              Pending Orders
            </button>
            <button
              onClick={() => handleSectionChange("by-product")}
              className={`${
                activeSection === "by-product"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              By Product
            </button>
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email, phone, city, order ID, payment ID…"
            className="w-full pl-9 pr-10 py-2 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {loading && isSearchMode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500" />
            </div>
          )}
        </div>
      </div>

      {/* Product selector for By Product tab */}
      {activeSection === "by-product" && (
        <div className="mb-4" ref={productDropdownRef}>
          <label
            className="block text-sm font-medium text-zinc-300 mb-1"
          >
            Select a product to filter orders:
          </label>
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={productDropdownOpen ? productSearch : productFilter || productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setProductDropdownOpen(true);
              }}
              onFocus={() => setProductDropdownOpen(true)}
              placeholder="Search products…"
              className="w-full pl-9 pr-8 py-2 rounded-md border border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {(productFilter || productSearch) && (
              <button
                onClick={() => {
                  setProductFilter("");
                  setProductSearch("");
                  setProductDropdownOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400"
              >
                ×
              </button>
            )}
            {productDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-md shadow-lg">
                <button
                  onClick={() => {
                    setProductFilter("");
                    setProductSearch("");
                    setProductDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-500/5 ${
                    !productFilter ? "bg-amber-500/10 text-amber-300 font-medium" : "text-zinc-300"
                  }`}
                >
                  All Products
                </button>
                {availableProducts
                  .filter((name) =>
                    name.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setProductFilter(name);
                        setProductSearch("");
                        setProductDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-500/5 ${
                        productFilter === name ? "bg-amber-500/10 text-amber-300 font-medium" : "text-zinc-300"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                {availableProducts.filter((name) =>
                  name.toLowerCase().includes(productSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-zinc-500">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold">
          {activeSection === "all"
            ? "All Orders"
            : activeSection === "pending"
              ? "Pending Orders"
              : productFilter
                ? `Orders for "${productFilter}"`
                : "Orders by Product"}
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:space-x-4">
          {/* Cart Temp Toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-zinc-300">
              Show Cart Temp:
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showCartTemp}
                onChange={(e) => setShowCartTemp(e.target.checked)}
                className="sr-only peer"
              />
              <div className='relative w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-900 after:border-zinc-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500'></div>
            </label>
          </div>

          {/* Status filter - only show in "All Orders" section */}
          {activeSection === "all" && (
            <div className="flex items-center space-x-2">
              <label
                htmlFor="statusFilter"
                className="text-sm font-medium text-zinc-300"
              >
                Status:
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="stand">Stand</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="cart_temp">Cart Temp</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {searchError && (
        <div className="rounded-lg bg-red-50 p-3 flex items-center gap-3 mb-4">
          <AlertCircle className="text-red-500 h-4 w-4 flex-shrink-0" />
          <p className="text-red-700 text-sm">{searchError}</p>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800 rounded-lg">
          <Package className="h-12 w-12 mx-auto text-zinc-500 mb-3" />
          <p className="text-zinc-400">
            {isSearchMode
              ? `No orders found for "${searchQuery}"`
              : orders.length === 0
                ? activeSection === "pending"
                  ? "No pending orders found"
                  : "No orders found"
                : showCartTemp
                  ? "No orders found"
                  : "No orders found (hiding CART_TEMP orders)"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const totalItems =
              order.items.length +
              (order.partItems?.length || 0) +
              (order.powdercoatItems?.length || 0);

            return (
              <div
                key={order.id}
                className="border rounded-lg overflow-hidden bg-zinc-900"
              >
                {/* Order Header - always visible */}
                <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-zinc-800 gap-3">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 cursor-pointer flex-grow"
                    onClick={() => toggleOrderExpansion(order.id)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono text-sm">
                        #{order.id}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigator.clipboard.writeText(order.id).then(() => {
                            setCopiedOrderId(order.id);
                            setTimeout(() => setCopiedOrderId(null), 1500);
                          });
                        }}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-400 transition-colors"
                        title="Copy order ID"
                      >
                        {copiedOrderId === order.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                    {/* Download Invoice Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void downloadInvoicePDF(order);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded border border-purple-700 transition-colors duration-200 font-medium shadow-sm"
                      title="Download invoice PDF"
                    >
                      <Download className="h-3 w-3" />
                      <span>Invoice</span>
                    </button>

                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.id, e.target.value);
                        }}
                        disabled={updatingStatus[order.id]}
                        className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-none ${getOrderStatusClass(
                          order.status,
                        )} ${
                          updatingStatus[order.id]
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="stand">Stand</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="cart_temp">Cart Temp</option>
                      </select>
                      {updatingStatus[order.id] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        </div>
                      )}
                    </div>

                    <p className="font-medium text-amber-400">
                      CHF {parseFloat(order.totalPrice).toFixed(2)}
                    </p>
                    <div
                      className="cursor-pointer p-1"
                      onClick={() => toggleOrderExpansion(order.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details - visible when expanded */}
                {isExpanded && (
                  <div className="border-t border-zinc-700 p-4 bg-zinc-800">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="font-medium text-zinc-100 mb-3 flex items-center gap-1">
                          <User className="h-4 w-4" /> Customer Information
                        </h3>
                        <div className="bg-zinc-900 p-4 rounded-md shadow-sm space-y-2">
                          <p>
                            <span className="font-medium">Name:</span>{" "}
                            {order.firstName} {order.lastName}
                          </p>
                          <p className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                            <span className="break-all">{order.email}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                            <span>{order.phone}</span>
                          </p>
                          <div className="flex gap-1 align-top">
                            <MapPin className="h-4 w-4 text-zinc-400 mt-1 flex-shrink-0" />
                            <div>
                              <p>
                                {order.street} {order.houseNumber}
                              </p>
                              <p>
                                {order.zipCode} {order.city}
                              </p>
                              <p>
                                {COUNTRY_NAMES[order.country] ?? order.country}
                              </p>
                              {order.additionalAddressInfo && (
                                <p className="italic text-zinc-400 text-sm mt-1">
                                  {order.additionalAddressInfo}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order Information */}
                      <div>
                        <h3 className="font-medium text-zinc-100 mb-3 flex items-center gap-1">
                          <Package className="h-4 w-4" /> Order Information
                        </h3>
                        <div className="bg-zinc-900 p-4 rounded-md shadow-sm space-y-2">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <span>
                              {new Date(order.orderDate).toLocaleDateString()}{" "}
                              {new Date(order.orderDate).toLocaleTimeString()}
                            </span>
                          </p>
                          <p className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4 text-zinc-400" />
                            <span className="capitalize">
                              {order.paymentMethod}
                            </span>
                            {order.paymentId && (
                              <span className="text-zinc-400 text-sm">
                                (ID: {order.paymentId})
                              </span>
                            )}
                          </p>
                          {order.shipmentCarrier && (
                            <p>
                              <span className="font-medium">Carrier:</span>{" "}
                              {order.shipmentCarrier}
                            </p>
                          )}

                          {/* Add discount code information */}
                          {renderDiscountInfo(order)}

                          <p>
                            <span className="font-medium">Items total:</span>{" "}
                            CHF{" "}
                            {(
                              parseFloat(order.totalPrice) -
                              parseFloat(order.shipmentCost || "0")
                            ).toFixed(2)}
                          </p>
                          <p>
                            <span className="font-medium">Shipping:</span> CHF{" "}
                            {parseFloat(order.shipmentCost || "0").toFixed(2)}
                          </p>
                          <p className="text-lg font-bold text-amber-400">
                            <span className="font-medium">Total:</span> CHF{" "}
                            {parseFloat(order.totalPrice).toFixed(2)}
                          </p>
                          {order.comment && (
                            <div className="border-t border-zinc-700 mt-2 pt-2">
                              <p className="font-medium">Comment:</p>
                              <p className="text-zinc-300">{order.comment}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <h3 className="font-medium text-zinc-100 mt-6 mb-3">
                      Order Items ({totalItems})
                    </h3>

                    <div className="space-y-3">
                      {/* Sticker items */}
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-zinc-900 p-4 rounded-md shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-24 h-24 sm:w-20 sm:h-20 bg-zinc-700 rounded relative flex-shrink-0 mx-auto sm:mx-0">
                              {item.processedImage ? (
                                <Image
                                  src={item.processedImage}
                                  alt={
                                    item.sticker?.translations?.[0]?.title ||
                                    "Product Image"
                                  }
                                  fill
                                  className="object-cover rounded"
                                  sizes="(max-width: 640px) 96px, 80px"
                                  unoptimized={true}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "/512x512.png";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium">
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mr-2">
                                  Sticker
                                </span>
                                {item.sticker?.translations &&
                                item.sticker.translations.length > 0
                                  ? item.sticker.translations[0].title
                                  : "Custom Sticker"}
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm mt-1">
                                <p>
                                  <span className="text-zinc-400">
                                    Dimensions:
                                  </span>{" "}
                                  {item.width} x {item.height} cm
                                </p>
                                <p>
                                  <span className="text-zinc-400">Type:</span>{" "}
                                  {item.vinyl ? "Vinyl" : "Printable"}
                                </p>
                                <p>
                                  <span className="text-zinc-400">
                                    Quantity:
                                  </span>{" "}
                                  {item.quantity}
                                </p>
                                {item.sticker?.weight != null && (
                                  <p>
                                    <span className="text-zinc-400">
                                      Weight:
                                    </span>{" "}
                                    {item.sticker.weight} g
                                  </p>
                                )}
                              </div>

                              {/* Customization Options */}
                              {item.customizationOptions &&
                                item.customizationOptions.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-zinc-700">
                                    <p className="text-sm font-medium mb-1">
                                      Customizations:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                      {item.customizationOptions.map(
                                        (option, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-wrap items-center"
                                          >
                                            <span className="text-zinc-400 mr-1 text-xs">
                                              {option.type === "inputfield" &&
                                                "Text:"}
                                              {option.type === "color" &&
                                                "Color:"}
                                              {option.type === "vinylColors" &&
                                                "Vinyl Color:"}
                                              {option.type ===
                                                "powdercoatColors" &&
                                                "Powdercoat Color:"}
                                              {option.type === "dropdown" &&
                                                "Selection:"}
                                              {option.type ===
                                                "filamentColor" &&
                                                "Filament Color:"}
                                            </span>
                                            <span className="break-words max-w-full">
                                              {option.type === "dropdown" ? (
                                                getDropdownLabel(item, option)
                                              ) : option.type ===
                                                "filamentColor" ? (
                                                getFilamentColorLabel(item, option)
                                              ) : option.type === "color" ||
                                                option.type === "vinylColors" ||
                                                option.type ===
                                                  "powdercoatColors" ? (
                                                <div className="flex items-center">
                                                  <div
                                                    className="w-3 h-3 mr-1 inline-block rounded-sm border border-zinc-700"
                                                    style={{
                                                      backgroundColor:
                                                        option.value ===
                                                        "transparent"
                                                          ? "transparent"
                                                          : option.value,
                                                      backgroundImage:
                                                        option.value ===
                                                        "transparent"
                                                          ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)"
                                                          : "none",
                                                      backgroundSize:
                                                        option.value ===
                                                        "transparent"
                                                          ? "6px 6px"
                                                          : "auto",
                                                      backgroundPosition:
                                                        option.value ===
                                                        "transparent"
                                                          ? "0 0, 3px 3px"
                                                          : "auto",
                                                    }}
                                                  ></div>
                                                  {option.value}
                                                </div>
                                              ) : (
                                                option.value
                                              )}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Part items - Render separately from sticker items */}
                      {order.partItems?.map((item) => (
                        <div
                          key={item.id}
                          className="bg-zinc-900 p-4 rounded-md shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-24 h-24 sm:w-20 sm:h-20 bg-zinc-700 rounded relative flex-shrink-0 mx-auto sm:mx-0">
                              {item.processedImage ? (
                                <Image
                                  src={item.processedImage}
                                  alt={
                                    item.part?.translations?.[0]?.title ||
                                    "Part Image"
                                  }
                                  fill
                                  className="object-cover rounded"
                                  sizes="(max-width: 640px) 96px, 80px"
                                  unoptimized={true}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = "/512x512.png";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium">
                                <span className="text-xs bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full mr-2">
                                  Part
                                </span>
                                {item.part?.translations &&
                                item.part.translations.length > 0
                                  ? item.part.translations[0].title
                                  : "Part Item"}
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm mt-1">
                                <p>
                                  <span className="text-zinc-400">Price:</span>{" "}
                                  CHF {item.part?.price || "0"}
                                </p>
                                <p>
                                  <span className="text-zinc-400">
                                    Quantity:
                                  </span>{" "}
                                  {item.quantity}
                                </p>
                                {(item.part?.width != null || item.part?.height != null || item.part?.length != null) && (
                                  <p>
                                    <span className="text-zinc-400">Size:</span>{" "}
                                    {[item.part?.width, item.part?.height, item.part?.length]
                                      .filter((v) => v != null)
                                      .join(" × ")}{" "}
                                    cm
                                  </p>
                                )}
                                {item.part?.weight != null && (
                                  <p>
                                    <span className="text-zinc-400">Weight:</span>{" "}
                                    {item.part.weight} g
                                  </p>
                                )}
                              </div>

                              {/* Part customization options */}
                              {item.customizationOptions &&
                                item.customizationOptions.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-zinc-700">
                                    <p className="text-sm font-medium mb-1">
                                      Customizations:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                      {item.customizationOptions.map(
                                        (option, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-wrap items-center"
                                          >
                                            <span className="text-zinc-400 mr-1 text-xs">
                                              {option.type === "inputfield" &&
                                                "Text:"}
                                              {option.type === "color" &&
                                                "Color:"}
                                              {option.type ===
                                                "powdercoatColors" &&
                                                "Powdercoat Color:"}
                                              {option.type === "dropdown" &&
                                                "Selection:"}
                                              {option.type ===
                                                "filamentColor" &&
                                                "Filament Color:"}
                                            </span>
                                            <span className="truncate">
                                              {option.type === "dropdown"
                                                ? getDropdownLabel(item, option)
                                                : option.type === "filamentColor"
                                                  ? getFilamentColorLabel(item, option)
                                                  : option.value}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Powdercoat Service Items */}
                      {order.powdercoatItems?.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 bg-zinc-800"
                        >
                          <div className="flex gap-3">
                            {/* Powdercoat Service Image */}
                            <div className="w-16 h-16 bg-zinc-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.processedImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.processedImage}
                                  alt={
                                    item.powdercoatingService?.name ||
                                    "Powdercoat Service"
                                  }
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<span class="text-zinc-500 text-xs">No image</span>';
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-zinc-500 text-xs">
                                  No image
                                </span>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-2">
                                    POWDERCOAT
                                  </span>
                                  <h4 className="font-medium">
                                    {item.powdercoatingService?.name ||
                                      "Powdercoat Service"}
                                  </h4>
                                  {item.powdercoatingService?.description && (
                                    <p className="text-sm text-zinc-400 mt-1">
                                      {item.powdercoatingService.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Price:</span>{" "}
                                  CHF{" "}
                                  {(
                                    parseFloat(
                                      item.powdercoatingService?.price || "0",
                                    ) * item.quantity
                                  ).toFixed(2)}{" "}
                                  (
                                  {parseFloat(
                                    item.powdercoatingService?.price || "0",
                                  ).toFixed(2)}{" "}
                                  × {item.quantity})
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Color:</span>{" "}
                                  <span className="inline-flex items-center gap-1">
                                    <div
                                      className="w-4 h-4 rounded border border-zinc-700"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    {item.color}
                                  </span>
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Quantity:</span>{" "}
                                  {item.quantity}
                                </p>
                              </div>

                              {/* Powdercoat customization options */}
                              {item.customizationOptions &&
                                item.customizationOptions.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-zinc-700">
                                    <p className="text-sm font-medium mb-1">
                                      Customizations:
                                    </p>
                                    <div className="space-y-1">
                                      {item.customizationOptions.map(
                                        (option, index) => (
                                          <div
                                            key={index}
                                            className="flex gap-2 text-sm"
                                          >
                                            <span className="font-medium">
                                              {option.type === "inputfield" &&
                                                "Text:"}
                                              {option.type === "color" &&
                                                "Color:"}
                                              {option.type ===
                                                "powdercoatColors" &&
                                                "Powdercoat Color:"}
                                              {option.type === "dropdown" &&
                                                "Selection:"}
                                              {option.type ===
                                                "filamentColor" &&
                                                "Filament Color:"}
                                            </span>
                                            <span className="truncate">
                                              {option.value}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
