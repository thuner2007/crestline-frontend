import { useState, useEffect } from "react";
import NextImage from "next/image";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Edit,
  Copy,
} from "lucide-react";
import storage from "@/lib/storage";
import { Sticker } from "@/types/sticker/sticker.type";
import { Tooltip } from "react-tooltip";
import useAxios from "@/useAxios";
import EditPart from "./EditPart";
import AddPart from "./AddPart";
import { Bike } from "lucide-react";

interface InventoryProps {
  csrfToken: string;
}

interface Meta {
  total: number;
  limit: number;
  skip: number;
  totalPages: number;
}

// Import CustomizationOption types from EditPart
type Translation = {
  title: string;
  description?: string;
  language?: string;
};

type BaseCustomizationOption = {
  type: "color" | "inputfield" | "dropdown" | "powdercoatColors" | "filamentColor";
  translations: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
  priceAdjustment?: number;
};

type InputFieldOption = BaseCustomizationOption & {
  type: "inputfield";
  max?: number;
};

type DropdownOption = BaseCustomizationOption & {
  type: "dropdown";
  items: {
    id: string;
    priceAdjustment: number;
    stock?: number; // Keep this for display purposes when fetched with stock
    translations: {
      de: Translation;
      en: Translation;
      fr: Translation;
      it: Translation;
    };
  }[];
};

type ColorOption = BaseCustomizationOption & {
  type: "color";
};

type PowdercoatColorsOption = BaseCustomizationOption & {
  type: "powdercoatColors";
};

type FilamentColorOption = BaseCustomizationOption & {
  type: "filamentColor";
  filamentTypeId?: string;
};

type CustomizationOption =
  | InputFieldOption
  | DropdownOption
  | ColorOption
  | PowdercoatColorsOption
  | FilamentColorOption;

// Bike Model interface
interface BikeModel {
  id: string;
  manufacturer: string;
  model: string;
  year: number | null;
  active: boolean;
}

// Part Group interface
interface PartGroup {
  id: string;
  createdAt: string;
  image: string | null;
  translations?: Array<{
    language: string;
    title: string;
  }>;
}

// Part Section interface
interface PartSectionMeta {
  id: string;
  sortingRank?: number;
  active?: boolean;
  translations: { language: string; title: string }[];
}

// Add interface for Part
interface Part {
  id: string;
  price: string;
  initialPrice?: string;
  quantity: number;
  type?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  images: string[];
  active: boolean;
  sortingRank: number;
  translations: {
    language: string;
    title: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
  shippingReady:
    | "now"
    | "in_1_3_days"
    | "in_4_7_days"
    | "in_8_14_days"
    | "unknown"
    | "pre_order";
  shippingDate?: string;
  customizationOptions?: {
    options: CustomizationOption[];
  };
  keywords?: string[];
  groups?: PartGroup[];
  bikeModels?: BikeModel[];
  sections?: PartSectionMeta[];
}

// Controlled stock input that only calls the update when typing is finished
const StockInput = ({
  initialValue,
  onUpdate,
  disabled,
}: {
  initialValue: number;
  onUpdate: (value: number) => void;
  disabled: boolean;
}) => {
  const [value, setValue] = useState<string>(String(initialValue));

  useEffect(() => {
    setValue(String(initialValue));
  }, [initialValue]);

  const commit = () => {
    const parsed = parseInt(value, 10);
    onUpdate(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      disabled={disabled}
      className="w-16 text-xs border border-zinc-700 rounded px-1 py-0.5 text-center bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-600 disabled:opacity-50"
      placeholder="0"
    />
  );
};

// Define the inventory type
type InventoryType = "stickers" | "parts";

// Define API response types
interface StickerResponse {
  data: Sticker[];
  meta?: Meta;
}

interface PartResponse {
  data: Part[];
  meta?: Meta;
}

const Inventory = ({ csrfToken }: InventoryProps) => {
  const [inventoryType, setInventoryType] = useState<InventoryType>("parts");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupParts, setGroupParts] = useState<Part[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    limit: 20,
    skip: 0,
    totalPages: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stickerToDelete, setStickerToDelete] = useState<Sticker | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [itemToCopy, setItemToCopy] = useState<Part | null>(null);
  const [, setShowBikeModelsModal] = useState(false);
  const [, setPartForBikeModels] = useState<Part | null>(null);
  const axiosInstance = useAxios();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allSections, setAllSections] = useState<PartSectionMeta[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Fetch items with pagination and filtering options
  const fetchItems = async (
    page = 0,
    statusFilter = status,
    search = searchTerm,
    itemType = inventoryType,
    sectionId = selectedSectionId,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("status", statusFilter);
      params.append("amount", "20");
      params.append("start", page.toString());
      params.append("sortBy", "updatedAt");
      params.append("sortOrder", "desc");

      if (search) {
        params.append("search", search);
      }

      if (sectionId && itemType === "parts") {
        params.append("sectionId", sectionId);
      }

      const endpoint =
        itemType === "stickers" ? "/stickers" : "/parts/with-stock";
      const response =
        itemType === "stickers"
          ? await axiosInstance.get<StickerResponse>(
              `${endpoint}?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${storage.getItem("access_token")}`,
                  "X-CSRF-Token": csrfToken,
                },
              },
            )
          : await axiosInstance.get<PartResponse>(
              `${endpoint}?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${storage.getItem("access_token")}`,
                  "X-CSRF-Token": csrfToken,
                },
              },
            );

      // Process images to ensure they have full URLs
      const processStickerItems = (items: Sticker[]) =>
        items.map((item) => ({
          ...item,
          images: item.images.map((img: string) => {
            if (img.startsWith("http")) {
              return img;
            } else {
              return `https://minio-api.cwx-dev.com/stickers/${img}`;
            }
          }),
        }));

      const processPartItems = (items: Part[]) =>
        items.map((item) => ({
          ...item,
          images: item.images.map((img: string) => {
            if (img.startsWith("http")) {
              return img;
            } else {
              return `https://minio-api.cwx-dev.com/parts/${img}`;
            }
          }),
        }));

      if (itemType === "stickers") {
        const stickerResponse = response.data as StickerResponse;
        const processedStickers = processStickerItems(stickerResponse.data);
        setStickers(processedStickers);
      } else {
        const partResponse = response.data as PartResponse;
        const processedParts = processPartItems(partResponse.data);
        setParts(processedParts);
      }

      const responseData = response.data as StickerResponse | PartResponse;
      setMeta(
        responseData.meta || {
          total: responseData.data.length,
          limit: 20,
          skip: page,
          totalPages: Math.ceil(responseData.data.length / 20),
        },
      );
    } catch (err: unknown) {
      console.error(`Error fetching ${itemType}:`, err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError(`Failed to load ${itemType}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryType]);

  // Fetch part sections for the tab bar
  useEffect(() => {
    if (inventoryType === "parts") {
      axiosInstance
        .get<PartSectionMeta[]>("/part-sections?includeInactive=true", {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        })
        .then((res) => setAllSections(res.data))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryType]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const filterButton = document.getElementById("filter-button");
      const filterDropdown = document.getElementById("filter-dropdown");

      if (
        isFilterOpen &&
        filterButton &&
        filterDropdown &&
        !filterButton.contains(event.target as Node) &&
        !filterDropdown.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Toggle item active status
  const toggleItemActive = async (id: string) => {
    setProcessingItemId(id);
    try {
      const endpoint =
        inventoryType === "stickers"
          ? `/stickers/${id}/toggle-active`
          : `/parts/${id}/toggle-active`;

      await axiosInstance.patch<{ success: boolean }>(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      // Update local state based on inventory type
      if (inventoryType === "stickers") {
        setStickers(
          stickers.map((item) =>
            item.id === id ? { ...item, active: !item.active } : item,
          ),
        );

        const sticker = stickers.find((s) => s.id === id);
        if (sticker) {
          setSuccessMessage(
            `Sticker "${getTitle(sticker)}" ${
              !sticker.active ? "activated" : "deactivated"
            } successfully`,
          );
        }
      } else {
        setParts(
          parts.map((item) =>
            item.id === id ? { ...item, active: !item.active } : item,
          ),
        );
        setGroupParts(
          groupParts.map((item) =>
            item.id === id ? { ...item, active: !item.active } : item,
          ),
        );

        const part = parts.find((p) => p.id === id) || groupParts.find((p) => p.id === id);
        if (part) {
          setSuccessMessage(
            `Part "${getPartTitle(part)}" ${
              !part.active ? "activated" : "deactivated"
            } successfully`,
          );
        }
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error(`Error toggling ${inventoryType} active status:`, err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError(`Failed to update ${inventoryType} status`);
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Delete an item
  const deleteItem = async () => {
    const itemToDelete =
      inventoryType === "stickers" ? stickerToDelete : partToDelete;
    if (!itemToDelete) return;

    setProcessingItemId(itemToDelete.id);
    try {
      const endpoint =
        inventoryType === "stickers"
          ? `/stickers/${itemToDelete.id}`
          : `/parts/${itemToDelete.id}`;

      await axiosInstance.delete<{ success: boolean }>(endpoint, {
        headers: {
          Authorization: `Bearer ${storage.getItem("access_token")}`,
          "X-CSRF-Token": csrfToken,
        },
      });

      // Update local state based on inventory type
      if (inventoryType === "stickers") {
        setStickers(stickers.filter((s) => s.id !== itemToDelete.id));
        setSuccessMessage(
          `Sticker "${getTitle(itemToDelete as Sticker)}" deleted successfully`,
        );
      } else {
        setParts(parts.filter((p) => p.id !== itemToDelete.id));
        setGroupParts(groupParts.filter((p) => p.id !== itemToDelete.id));
        setSuccessMessage(
          `Part "${getPartTitle(itemToDelete as Part)}" deleted successfully`,
        );
      }

      setShowDeleteModal(false);
      setStickerToDelete(null);
      setPartToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error(`Error deleting ${inventoryType}:`, err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError(`Failed to delete ${inventoryType}`);
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Update shipping status for parts
  const updateShippingStatus = async (
    partId: string,
    newStatus:
      | "now"
      | "in_1_3_days"
      | "in_4_7_days"
      | "in_8_14_days"
      | "unknown"
      | "pre_order",
  ) => {
    setProcessingItemId(partId);
    try {
      await axiosInstance.patch(
        `/parts/${partId}/shipping-ready`,
        { shippingReady: newStatus },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      // Update local state
      setParts(
        parts.map((part) =>
          part.id === partId ? { ...part, shippingReady: newStatus } : part,
        ),
      );
      setGroupParts(
        groupParts.map((part) =>
          part.id === partId ? { ...part, shippingReady: newStatus } : part,
        ),
      );

      const part = parts.find((p) => p.id === partId) || groupParts.find((p) => p.id === partId);
      if (part) {
        setSuccessMessage(
          `Part "${getPartTitle(
            part,
          )}" shipping status updated to "${newStatus}"`,
        );
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error updating shipping status:", err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to update shipping status");
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Update shipping date for pre-order parts
  const updateShippingDate = async (partId: string, newDate: string) => {
    setProcessingItemId(partId);
    try {
      const isoDate = new Date(newDate).toISOString();

      await axiosInstance.patch(
        `/parts/${partId}/shipping-date`,
        { shippingDate: isoDate },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      // Update local state
      setParts(
        parts.map((part) =>
          part.id === partId ? { ...part, shippingDate: isoDate } : part,
        ),
      );
      setGroupParts(
        groupParts.map((part) =>
          part.id === partId ? { ...part, shippingDate: isoDate } : part,
        ),
      );

      const part = parts.find((p) => p.id === partId) || groupParts.find((p) => p.id === partId);
      if (part) {
        setSuccessMessage(
          `Part "${getPartTitle(part)}" shipping date updated successfully`,
        );
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error updating shipping date:", err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to update shipping date");
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Update dropdown option stock
  const updateOptionStock = async (
    partId: string,
    optionIndex: number,
    optionItemId: string,
    quantity: number,
  ) => {
    setProcessingItemId(partId);
    try {
      await axiosInstance.patch(
        `/parts/${partId}/option-stock`,
        {
          optionId: optionIndex.toString(),
          optionItemId,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      // Update local state
      const updatePartOptionStock = (partsList: Part[]) =>
        partsList.map((part) => {
          if (part.id === partId && part.customizationOptions) {
            const updatedOptions = part.customizationOptions.options.map(
              (option, index) => {
                if (option.type === "dropdown" && index === optionIndex) {
                  return {
                    ...option,
                    items:
                      option.items?.map((item) =>
                        item.id === optionItemId
                          ? { ...item, stock: quantity }
                          : item,
                      ) || [],
                  };
                }
                return option;
              },
            );

            return {
              ...part,
              customizationOptions: {
                ...part.customizationOptions,
                options: updatedOptions,
              },
            };
          }
          return part;
        });

      setParts(updatePartOptionStock(parts));
      setGroupParts(updatePartOptionStock(groupParts));

      const part = parts.find((p) => p.id === partId) || groupParts.find((p) => p.id === partId);
      if (part) {
        setSuccessMessage(`Stock updated successfully for option item`);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error updating option stock:", err);

      // Type guard for axios-like errors
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
        typeof err.response.data.message === "string"
      ) {
        setError(err.response.data.message);
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to update option stock");
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Helper function to get sticker title
  const getTitle = (sticker: Sticker): string => {
    // Find English translation or fall back to first available
    const enTranslation = sticker.translations.find((t) => t.language === "en");
    return (
      enTranslation?.title ||
      sticker.translations[0]?.title ||
      "Untitled Sticker"
    );
  };

  // Helper function to get part title
  const getPartTitle = (part: Part): string => {
    // Find English translation or fall back to first available
    const enTranslation = part.translations.find((t) => t.language === "en");
    return (
      enTranslation?.title || part.translations[0]?.title || "Untitled Part"
    );
  };

  // Helper function to get section title
  const getSectionTitle = (section: PartSectionMeta): string =>
    section.translations.find((t) => t.language === "en")?.title ||
    section.translations[0]?.title ||
    "Unknown Section";

  // Helper function to get shipping status color and text
  const getShippingStatusInfo = (
    shippingReady: string,
    shippingDate?: string,
  ) => {
    switch (shippingReady) {
      case "now":
        return {
          color: "bg-green-100 text-green-800",
          text: "Ready to ship",
        };
      case "in_1_3_days":
        return {
          color: "bg-yellow-100 text-yellow-800",
          text: "Ships in 1-3 days",
        };
      case "in_4_7_days":
        return {
          color: "bg-orange-100 text-orange-800",
          text: "Ships in 4-7 days",
        };
      case "in_8_14_days":
        return {
          color: "bg-red-100 text-red-800",
          text: "Ships in 8-14 days",
        };
      case "pre_order":
        const dateText = shippingDate
          ? new Date(shippingDate).toLocaleDateString("en", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "TBD";
        return {
          color: "bg-blue-100 text-blue-800",
          text: `Pre-order (Ships: ${dateText})`,
        };
      case "unknown":
      default:
        return {
          color: "bg-zinc-800 text-zinc-200",
          text: "Unknown",
        };
    }
  };

  // Handle part update
  const handlePartUpdate = (updatedPart: Part) => {
    setParts(
      parts.map((part) => (part.id === updatedPart.id ? updatedPart : part)),
    );
    setGroupParts(
      groupParts.map((part) => (part.id === updatedPart.id ? updatedPart : part)),
    );
    setSuccessMessage(
      `Part "${getPartTitle(updatedPart)}" updated successfully`,
    );
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Fetch full part data (includes customizationOptions)
  const fetchFullPart = async (partId: string): Promise<Part | null> => {
    try {
      const response = await axiosInstance.get<Part>(
        `/parts/${partId}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      console.log("[fetchFullPart] /parts/:id response:", JSON.stringify(response.data, null, 2));

      // Also try to get stock data by fetching from with-stock list
      try {
        const stockResponse = await axiosInstance.get<PartResponse>(
          `/parts/with-stock?amount=200&start=0`,
          {
            headers: {
              Authorization: `Bearer ${storage.getItem("access_token")}`,
              "X-CSRF-Token": csrfToken,
            },
          },
        );
        const withStock = stockResponse.data.data.find((p) => p.id === partId);
        console.log("[fetchFullPart] with-stock match for part:", JSON.stringify(withStock, null, 2));
        if (withStock?.customizationOptions) {
          return { ...response.data, customizationOptions: withStock.customizationOptions };
        }
      } catch {
        // ignore, return base data
      }
      return response.data;
    } catch {
      return null;
    }
  };

  // Handle edit item - fetch fresh full data first
  const handleEditItem = async (item: Part) => {
    setProcessingItemId(item.id);
    const fullPart = await fetchFullPart(item.id);
    setProcessingItemId(null);
    setPartToEdit(fullPart || item);
    setShowEditModal(true);
  };

  // Handle copy item - fetch fresh full data first
  const handleCopyItem = async (item: Part | Sticker) => {
    if (inventoryType === "parts") {
      setProcessingItemId(item.id);
      const fullPart = await fetchFullPart(item.id);
      setProcessingItemId(null);
      setItemToCopy(fullPart || (item as Part));
      setShowCopyModal(true);
    }
  };

  // Switch inventory type
  const switchInventoryType = (type: InventoryType) => {
    setInventoryType(type);
    // Reset other states when changing inventory type
    setSearchTerm("");
    setStatus("all");
    setError(null);
    setSelectedGroup(null);
    setGroupParts([]);
    setSelectedSectionId(null);
  };

  // Switch section tab
  const handleSectionChange = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setMeta({ total: 0, limit: 20, skip: 0, totalPages: 0 });
    fetchItems(0, status, searchTerm, inventoryType, sectionId);
  };

  // Filter items client-side if search term is provided
  const filteredItems = () => {
    const term = searchTerm.toLowerCase();
    if (inventoryType === "stickers") {
      return term
        ? stickers.filter((sticker) =>
            sticker.translations.some(
              (t) =>
                t.title.toLowerCase().includes(term) ||
                t.description.toLowerCase().includes(term),
            ),
          )
        : stickers;
    } else if (selectedGroup) {
      return term
        ? groupParts.filter((part) =>
            part.translations.some(
              (t) =>
                t.title.toLowerCase().includes(term) ||
                (t.description && t.description.toLowerCase().includes(term)),
            ),
          )
        : groupParts;
    } else {
      return term
        ? parts.filter((part) =>
            part.translations.some(
              (t) =>
                t.title.toLowerCase().includes(term) ||
                (t.description && t.description.toLowerCase().includes(term)),
            ),
          )
        : parts;
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchItems(newPage, status, searchTerm);
  };

  // Handle status filter change
  const handleStatusChange = (newStatus: "all" | "active" | "inactive") => {
    setStatus(newStatus);
    fetchItems(0, newStatus, searchTerm);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(0, status, searchTerm);
  };

  // Prepare items for UI rendering
  const itemsToRender = filteredItems();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Add inventory type toggle here */}
          <div className="flex rounded-md overflow-hidden border border-zinc-700 self-start">
            {/* <button
              onClick={() => switchInventoryType("stickers")}
              className={`px-3 sm:px-4 py-2 text-sm sm:text-base ${
                inventoryType === "stickers"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Stickers
            </button> */}
            <button
              onClick={() => switchInventoryType("parts")}
              className={`px-3 sm:px-4 py-2 text-sm sm:text-base ${
                inventoryType === "parts"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Parts
            </button>
          </div>

          <div className="flex flex-1 sm:flex-none gap-2 w-full sm:w-auto">
            <form
              onSubmit={handleSearch}
              className="relative flex-1 sm:flex-auto"
            >
              <input
                type="text"
                placeholder={`Search ${inventoryType}...`}
                className="pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
              <button type="submit" className="sr-only">
                Search
              </button>
            </form>

            <div className="relative inline-block">
              <button
                id="filter-button"
                className="px-3 sm:px-4 py-2 border rounded-md bg-zinc-900 flex items-center gap-1 whitespace-nowrap"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              {isFilterOpen && (
                <div
                  id="filter-dropdown"
                  className="mt-1 absolute right-0 w-56 bg-zinc-900 rounded-md shadow-lg z-10 border"
                >
                  <div className="p-2 space-y-1">
                    <button
                      className={`block w-full text-left px-4 py-2 rounded ${
                        status === "all"
                          ? "bg-amber-500/10 text-amber-300"
                          : "hover:bg-zinc-800"
                      }`}
                      onClick={() => handleStatusChange("all")}
                    >
                      All {inventoryType === "stickers" ? "Stickers" : "Parts"}
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 rounded ${
                        status === "active"
                          ? "bg-amber-500/10 text-amber-300"
                          : "hover:bg-zinc-800"
                      }`}
                      onClick={() => handleStatusChange("active")}
                    >
                      Active Only
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 rounded ${
                        status === "inactive"
                          ? "bg-amber-500/10 text-amber-300"
                          : "hover:bg-zinc-800"
                      }`}
                      onClick={() => handleStatusChange("inactive")}
                    >
                      Inactive Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs for parts */}
      {inventoryType === "parts" && allSections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSectionChange(null)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              selectedSectionId === null
                ? "bg-amber-600 border-amber-600 text-white"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {allSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => handleSectionChange(sec.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                selectedSectionId === sec.id
                  ? "bg-amber-600 border-amber-600 text-white"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {getSectionTitle(sec)}
            </button>
          ))}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="bg-amber-500/10 border border-purple-400 text-amber-300 p-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <>
          {/* Items grid */}
          {itemsToRender.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(itemsToRender as (Part | Sticker)[]).map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg overflow-hidden bg-zinc-900 ${
                    !item.active ? "opacity-75" : ""
                  }`}
                >
                  <div className="h-48 sm:h-40 relative overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <NextImage
                        width={400}
                        src={item.images[0]}
                        height={400}
                        alt={
                          inventoryType === "stickers"
                            ? getTitle(item as Sticker)
                            : getPartTitle(item as Part)
                        }
                        className="object-contain w-full h-full"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                          console.error(
                            `Failed to load image for ${inventoryType} item:`,
                            item.id,
                          );
                        }}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={Boolean(
                          item &&
                          itemsToRender.findIndex((i) => i.id === item.id) < 4,
                        )}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-zinc-800 text-zinc-500">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-zinc-100 text-sm sm:text-base pr-2">
                        {inventoryType === "stickers"
                          ? getTitle(item as Sticker)
                          : getPartTitle(item as Part)}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                          item.active
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between text-xs sm:text-sm gap-y-1">
                      <span className="text-zinc-400 mr-2">
                        ID: {item.id.substring(0, 8)}...
                      </span>
                      <span className="text-zinc-400">
                        Stock: {item.quantity}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-zinc-400 break-words">
                        Price: CHF{" "}
                        {inventoryType === "stickers"
                          ? ((item as Sticker).standardMethod === "printable"
                              ? (item as Sticker).pricePerCm2Printable
                              : (item as Sticker).pricePerCm2Vinyl) + "/cm²"
                          : (() => {
                              const part = item as Part;
                              if (
                                part.initialPrice &&
                                parseFloat(part.initialPrice) >
                                  parseFloat(part.price)
                              ) {
                                return (
                                  <span className="flex items-center gap-2">
                                    <span className="text-red-600 font-semibold">
                                      {part.price}
                                    </span>
                                    <span className="line-through text-zinc-500">
                                      {part.initialPrice}
                                    </span>
                                  </span>
                                );
                              }
                              return part.price;
                            })()}
                      </span>
                    </div>

                    {/* Type for parts */}
                    {inventoryType === "parts" && (item as Part).type && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-zinc-400 break-words">
                          Type: {(item as Part).type}
                        </span>
                      </div>
                    )}

                    {/* Weight & Dimensions for parts */}
                    {inventoryType === "parts" && (
                      ((item as Part).weight != null ||
                        (item as Part).width != null ||
                        (item as Part).height != null ||
                        (item as Part).length != null) && (
                        <div className="text-xs sm:text-sm text-zinc-400 space-y-0.5">
                          {(item as Part).weight != null && (
                            <div>Weight: {(item as Part).weight} g</div>
                          )}
                          {((item as Part).width != null ||
                            (item as Part).height != null ||
                            (item as Part).length != null) && (
                            <div>
                              Dimensions:{" "}
                              {[(item as Part).width, (item as Part).height, (item as Part).length]
                                .filter((v) => v != null)
                                .join(" × ")}{" "}
                              cm
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Shipping status for parts */}
                    {inventoryType === "parts" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-y-1">
                          <span className="text-xs sm:text-sm text-zinc-400">
                            Shipping:
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              getShippingStatusInfo(
                                (item as Part).shippingReady,
                                (item as Part).shippingDate,
                              ).color
                            }`}
                          >
                            {
                              getShippingStatusInfo(
                                (item as Part).shippingReady,
                                (item as Part).shippingDate,
                              ).text
                            }
                          </span>
                        </div>
                        <select
                          value={(item as Part).shippingReady}
                          onChange={(e) =>
                            updateShippingStatus(
                              item.id,
                              e.target.value as
                                | "now"
                                | "in_1_3_days"
                                | "in_4_7_days"
                                | "in_8_14_days"
                                | "unknown"
                                | "pre_order",
                            )
                          }
                          disabled={processingItemId === item.id}
                          className="w-full text-xs border border-zinc-700 rounded-md px-2 py-1 bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:opacity-50"
                        >
                          <option value="now">Ready to ship</option>
                          <option value="in_1_3_days">Ships in 1-3 days</option>
                          <option value="in_4_7_days">Ships in 4-7 days</option>
                          <option value="in_8_14_days">
                            Ships in 8-14 days
                          </option>
                          <option value="pre_order">Pre-order</option>
                          <option value="unknown">Unknown</option>
                        </select>
                        {/* Date picker for pre-order items */}
                        {(item as Part).shippingReady === "pre_order" && (
                          <div className="mt-2">
                            <label className="block text-xs text-zinc-400 mb-1">
                              Expected shipping date:
                            </label>
                            <input
                              type="datetime-local"
                              value={
                                (item as Part).shippingDate
                                  ? new Date((item as Part).shippingDate!)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) =>
                                updateShippingDate(item.id, e.target.value)
                              }
                              disabled={processingItemId === item.id}
                              className="w-full text-xs border border-zinc-700 rounded-md px-2 py-1 bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:opacity-50"
                            />
                          </div>
                        )}

                        {/* Stock management for dropdown options */}
                        {inventoryType === "parts" &&
                          (item as Part).customizationOptions?.options &&
                          (item as Part).customizationOptions!.options.some(
                            (option) =>
                              option.type === "dropdown" &&
                              option.items &&
                              option.items.length > 0,
                          ) && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <h4 className="text-xs font-medium text-zinc-300 mb-2">
                                Option Stock Management
                              </h4>
                              {(item as Part).customizationOptions!.options.map(
                                (option, optionIndex) =>
                                  option.type === "dropdown" ? (
                                    <div
                                      key={option.translations.en.title}
                                      className="mb-3"
                                    >
                                      <div className="text-xs font-medium text-zinc-400 mb-1">
                                        {option.translations.en.title}
                                      </div>
                                      {(option as DropdownOption).items?.map(
                                        (dropdownItem) => (
                                          <div
                                            key={dropdownItem.id}
                                            className="flex items-center gap-2 mb-1"
                                          >
                                            <span className="text-xs text-zinc-400 flex-1 truncate">
                                              {
                                                dropdownItem.translations.en
                                                  .title
                                              }
                                            </span>
                                            <StockInput
                                              initialValue={dropdownItem.stock ?? 0}
                                              onUpdate={(newStock) =>
                                                updateOptionStock(
                                                  item.id,
                                                  optionIndex,
                                                  dropdownItem.id,
                                                  newStock,
                                                )
                                              }
                                              disabled={processingItemId === item.id}
                                            />
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : null,
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2 border-t mt-2">
                      <button
                        onClick={() => toggleItemActive(item.id)}
                        disabled={processingItemId === item.id}
                        className="text-blue-600 hover:text-blue-800 flex items-center text-xs sm:text-sm"
                        data-tooltip-id="tooltip"
                        data-tooltip-content={
                          item.active ? "Deactivate" : "Activate"
                        }
                      >
                        {item.active ? (
                          <ToggleRight className="h-4 w-4 mr-1 flex-shrink-0" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 mr-1 flex-shrink-0" />
                        )}
                        <span className="line-clamp-1 hidden sm:inline">
                          {item.active ? "Deactivate" : "Activate"}
                        </span>
                      </button>

                      {/* Copy button */}
                      <button
                        onClick={() => handleCopyItem(item)}
                        className="text-green-600 hover:text-green-800 flex items-center text-xs sm:text-sm"
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Copy"
                      >
                        <Copy className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>

                      {/* Edit button - only show for parts */}
                      {inventoryType === "parts" && (
                        <>
                          <button
                            onClick={() => handleEditItem(item as Part)}
                            className="text-amber-400 hover:text-amber-300 flex items-center text-xs sm:text-sm"
                            data-tooltip-id="tooltip"
                            data-tooltip-content="Edit"
                          >
                            <Edit className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setPartForBikeModels(item as Part);
                              setShowBikeModelsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-xs sm:text-sm"
                            data-tooltip-id="tooltip"
                            data-tooltip-content="Bike Models"
                          >
                            <Bike className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="hidden sm:inline">Bikes</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          if (inventoryType === "stickers") {
                            setStickerToDelete(item as Sticker);
                          } else {
                            setPartToDelete(item as Part);
                          }
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 flex items-center text-xs sm:text-sm"
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Delete"
                      >
                        <Trash2 className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 bg-zinc-800 rounded-lg">
              <p className="text-zinc-400">No {inventoryType} found</p>
            </div>
          )}

              {/* Pagination */}
              {meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4">
              <button
                onClick={() =>
                  handlePageChange(Math.max(0, meta.skip - meta.limit))
                }
                disabled={meta.skip === 0}
                className="p-2 rounded-md border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs sm:text-sm text-zinc-400">
                Page {Math.floor(meta.skip / meta.limit) + 1} of{" "}
                {meta.totalPages}
              </span>

              <button
                onClick={() => handlePageChange(meta.skip + meta.limit)}
                disabled={meta.skip + meta.limit >= meta.total}
                className="p-2 rounded-md border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
      {showDeleteModal &&
        (inventoryType === "stickers" ? stickerToDelete : partToDelete) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg max-w-md w-full p-4 sm:p-6">
              <h3 className="text-md sm:text-lg font-medium text-zinc-100 mb-3 sm:mb-4">
                Confirm Deletion
              </h3>
              <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">
                Are you sure you want to delete the{" "}
                {inventoryType === "stickers" ? "sticker" : "part"} &quot;
                {inventoryType === "stickers"
                  ? getTitle(stickerToDelete as Sticker)
                  : getPartTitle(partToDelete as Part)}
                &quot;? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStickerToDelete(null);
                    setPartToDelete(null);
                  }}
                  className="px-3 sm:px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800 text-sm sm:text-base"
                  disabled={
                    processingItemId ===
                    (inventoryType === "stickers"
                      ? stickerToDelete?.id
                      : partToDelete?.id)
                  }
                >
                  Cancel
                </button>

                <button
                  onClick={deleteItem}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center text-sm sm:text-base"
                  disabled={
                    processingItemId ===
                    (inventoryType === "stickers"
                      ? stickerToDelete?.id
                      : partToDelete?.id)
                  }
                >
                  {processingItemId ===
                  (inventoryType === "stickers"
                    ? stickerToDelete?.id
                    : partToDelete?.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Edit Part Modal */}
      {showEditModal && partToEdit && (
        <EditPart
          csrfToken={csrfToken}
          part={partToEdit}
          onClose={() => {
            setShowEditModal(false);
            setPartToEdit(null);
          }}
          onUpdate={handlePartUpdate}
        />
      )}

      {/* Copy Part Modal */}
      {showCopyModal && itemToCopy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-zinc-900 border-b px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-medium text-zinc-100">
                Copy {inventoryType === "parts" ? "Part" : "Sticker"}
              </h3>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setItemToCopy(null);
                }}
                className="text-zinc-500 hover:text-zinc-400"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {inventoryType === "parts" && (
                <AddPart
                  csrfToken={csrfToken}
                  initialData={itemToCopy as Part}
                  onSuccess={() => {
                    setShowCopyModal(false);
                    setItemToCopy(null);
                    fetchItems();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      <Tooltip id="tooltip" />
    </div>
  );
};

export default Inventory;
