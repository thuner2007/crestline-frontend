import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Trash2,
  Plus,
  Search,
  X,
  Loader2,
  ShoppingBag,
  Tag,
} from "lucide-react";
import storage from "@/lib/storage";
import Image from "next/image";
import useAxios from "@/useAxios";
import { Sticker } from "@/types/sticker/sticker.type";
import { Part } from "@/app/[locale]/item/[id]/page";

interface TodaysChoiceProps {
  csrfToken: string;
}

interface TodaysChoiceItem {
  id: string;
  stickerId: string | null;
  partId: string | null;
  createdAt: string;
  sticker?: Sticker;
  part?: Part; // Using any for part type since we don't have the exact type
}

interface StickerResponse {
  data: Sticker[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface PartResponse {
  data: Part[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

const TodaysChoice = ({ csrfToken }: TodaysChoiceProps) => {
  const [todaysChoiceItems, setTodaysChoiceItems] = useState<
    TodaysChoiceItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TodaysChoiceItem | null>(
    null,
  );
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  // For adding items
  const [itemType, setItemType] = useState<"sticker" | "part">("sticker");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableItems, setAvailableItems] = useState<(Sticker | Part)[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Ref for search input to auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  const axiosInstance = useAxios();

  // Fetch today's choice items
  const fetchTodaysChoiceItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<TodaysChoiceItem[]>(
        "/todays-choice",
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      // Fetch additional details for each item (sticker or part)
      const itemsWithDetails = await Promise.all(
        response.data.map(async (item: TodaysChoiceItem) => {
          if (item.stickerId) {
            try {
              const stickerResponse = await axiosInstance.get<Sticker>(
                `/stickers/${item.stickerId}`,
              );
              return {
                ...item,
                sticker: {
                  ...stickerResponse.data,
                  images: stickerResponse.data.images.map((img: string) => {
                    if (img.startsWith("http")) {
                      return img;
                    } else {
                      return `https://minio-api.cwx-dev.com/stickers/${img}`;
                    }
                  }),
                },
              };
            } catch (error) {
              console.error(`Error fetching sticker ${item.stickerId}:`, error);
              return item;
            }
          } else if (item.partId) {
            try {
              const partResponse = await axiosInstance.get<Part>(
                `/parts/${item.partId}`,
              );
              return {
                ...item,
                part: {
                  ...partResponse.data,
                  images: partResponse.data.images.map((img: string) => {
                    if (img.startsWith("http")) {
                      return img;
                    } else {
                      return `https://minio-api.cwx-dev.com/parts/${img}`;
                    }
                  }),
                },
              };
            } catch (error) {
              console.error(`Error fetching part ${item.partId}:`, error);
              return item;
            }
          }
          return item;
        }),
      );

      setTodaysChoiceItems(itemsWithDetails);
    } catch (err: unknown) {
      console.error("Error fetching today's choice items:", err);

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
        setError("Failed to load today's choice items");
      }
    } finally {
      setLoading(false);
    }
  };

  // Search for items to add
  const searchItems = async (page: number = 0) => {
    if (!searchTerm.trim()) {
      return; // Don't search with empty term
    }

    setLoadingItems(true);
    setError(null);
    setCurrentPage(page);
    try {
      if (itemType === "sticker") {
        const response = await axiosInstance.get<StickerResponse>("/stickers", {
          params: {
            status: "active",
            search: searchTerm.trim(),
            amount: itemsPerPage,
            start: page * itemsPerPage,
          },
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        });

        // Process images
        const processedStickers = response.data.data.map(
          (sticker: Sticker) => ({
            ...sticker,
            images: sticker.images.map((img: string) => {
              if (img.startsWith("http")) {
                return img;
              } else {
                return `https://minio-api.cwx-dev.com/stickers/${img}`;
              }
            }),
          }),
        );

        setAvailableItems(processedStickers);
        setTotalItems(response.data.meta?.total || processedStickers.length);
      } else {
        // Search for parts
        const response = await axiosInstance.get<PartResponse>("/parts", {
          params: {
            status: "active",
            search: searchTerm.trim(),
            amount: itemsPerPage,
            start: page * itemsPerPage,
          },
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        });

        // Process images
        const processedParts = response.data.data.map((part: Part) => ({
          ...part,
          images: part.images.map((img: string) => {
            if (img.startsWith("http")) {
              return img;
            } else {
              return `https://minio-api.cwx-dev.com/parts/${img}`;
            }
          }),
        }));

        setAvailableItems(processedParts);
        setTotalItems(response.data.meta?.total || processedParts.length);
      }
    } catch (err) {
      console.error(`Error searching ${itemType}s:`, err);
      setError(`Failed to search ${itemType}s. Please try again.`);
    } finally {
      setLoadingItems(false);
    }
  };

  // Add item to today's choice
  const addTodaysChoiceItem = async () => {
    if (!selectedItemId) return;

    setProcessingItemId("adding");
    setError(null);
    try {
      const payload =
        itemType === "sticker"
          ? { stickerId: selectedItemId }
          : { partId: selectedItemId };

      await axiosInstance.post<{ success: boolean }>(
        "/todays-choice",
        payload,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      setShowAddModal(false);
      setSelectedItemId(null);
      setSearchTerm("");
      setAvailableItems([]);
      fetchTodaysChoiceItems();

      setSuccessMessage(
        `${
          itemType === "sticker" ? "Sticker" : "Part"
        } added to Today's Choice successfully`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error adding item to today's choice:", err);

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
        setError("Failed to add item to Today's Choice");
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Delete item from today's choice
  const deleteItem = async () => {
    if (!itemToDelete) return;

    setProcessingItemId(itemToDelete.id);
    setError(null);
    try {
      await axiosInstance.delete<{ success: boolean }>(
        `/todays-choice/${itemToDelete.id}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      setTodaysChoiceItems(
        todaysChoiceItems.filter((item) => item.id !== itemToDelete.id),
      );
      setShowDeleteModal(false);
      setItemToDelete(null);

      setSuccessMessage("Item removed from Today's Choice successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Error removing item from today's choice:", err);

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
        setError("Failed to remove item from Today's Choice");
      }
    } finally {
      setProcessingItemId(null);
    }
  };

  // Handle opening the add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setSelectedItemId(null);
    setSearchTerm("");
    setAvailableItems([]);
    setCurrentPage(0);
    setTotalItems(0);
    setError(null);
    // Load initial items after a short delay to allow the modal to render
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      handleSearchInitialWithType(itemType, 0);
    }, 100);
  };

  // Handle changing the item type
  const handleItemTypeChange = (type: "sticker" | "part") => {
    setItemType(type);
    setSelectedItemId(null);
    setAvailableItems([]);
    setCurrentPage(0);
    setTotalItems(0);

    // Pass the type directly to handleSearchInitial instead of relying on state
    setTimeout(() => handleSearchInitialWithType(type, 0), 100);
  };

  const handleSearchInitialWithType = async (
    typeToUse: "sticker" | "part",
    page: number = 0,
  ) => {
    setLoadingItems(true);
    setCurrentPage(page);
    try {
      if (typeToUse === "sticker") {
        const response = await axiosInstance.get<StickerResponse>("/stickers", {
          params: {
            status: "active",
            amount: itemsPerPage,
            start: page * itemsPerPage,
          },
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        });

        const processedStickers = response.data.data.map(
          (sticker: Sticker) => ({
            ...sticker,
            images: sticker.images.map((img: string) => {
              if (img.startsWith("http")) {
                return img;
              } else {
                return `https://minio-api.cwx-dev.com/stickers/${img}`;
              }
            }),
          }),
        );

        setAvailableItems(processedStickers);
        setTotalItems(response.data.meta?.total || processedStickers.length);
      } else {
        const response = await axiosInstance.get<PartResponse>("/parts", {
          params: {
            status: "active",
            amount: itemsPerPage,
            start: page * itemsPerPage,
          },
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        });

        const processedParts = response.data.data.map((part: Part) => ({
          ...part,
          images: part.images.map((img: string) => {
            if (img.startsWith("http")) {
              return img;
            } else {
              return `https://minio-api.cwx-dev.com/parts/${img}`;
            }
          }),
        }));

        setAvailableItems(processedParts);
        setTotalItems(response.data.meta?.total || processedParts.length);
      }
    } catch (err) {
      console.error(`Error loading initial ${typeToUse}s:`, err);
    } finally {
      setLoadingItems(false);
    }
  };

  const getItemTitle = (item: TodaysChoiceItem): string => {
    if (item.sticker) {
      // Find English translation or fall back to first available
      const enTranslation = item.sticker.translations.find(
        (t) => t.language === "en",
      );
      return (
        enTranslation?.title ||
        item.sticker.translations[0]?.title ||
        "Untitled Sticker"
      );
    } else if (item.part) {
      const enTranslation = item.part.translations.find(
        (t: { language: string }) => t.language === "en",
      );
      return (
        enTranslation?.title ||
        item.part.translations[0]?.title ||
        "Untitled Part"
      );
    }
    return "Unknown Item";
  };

  const getAvailableItemTitle = (item: Sticker | Part): string => {
    // Find English translation or fall back to first available
    const enTranslation = item.translations.find(
      (t: { language: string; title: string }) => t.language === "en",
    );
    return (
      enTranslation?.title || item.translations[0]?.title || "Untitled Item"
    );
  };

  useEffect(() => {
    fetchTodaysChoiceItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Today&apos;s Choice Management
        </h2>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

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
          {todaysChoiceItems.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800 rounded-lg">
              <ShoppingBag className="h-12 w-12 mx-auto text-zinc-500 mb-3" />
              <p className="text-zinc-400">No items in Today&apos;s Choice</p>
              <p className="text-sm text-zinc-500 mt-1">
                Add featured items to showcase on the homepage
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {todaysChoiceItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg overflow-hidden bg-zinc-900"
                >
                  <div className="h-40 relative">
                    {item.sticker?.images && item.sticker.images.length > 0 ? (
                      <Image
                        src={item.sticker.images[0] || "/512x512.png"}
                        alt={getItemTitle(item)}
                        fill
                        className="object-cover"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                    ) : item.part?.images && item.part.images.length > 0 ? (
                      <Image
                        src={item.part.images[0] || "/512x512.png"}
                        alt={getItemTitle(item)}
                        fill
                        className="object-cover"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-zinc-800 text-zinc-500">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-amber-500/10 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                      {item.stickerId ? "Sticker" : "Part"}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3
                        className="font-medium text-zinc-100 line-clamp-1"
                        title={getItemTitle(item)}
                      >
                        {getItemTitle(item)}
                      </h3>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">
                        Added: {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-end border-t mt-2">
                      <button
                        onClick={() => {
                          setItemToDelete(item);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 flex items-center"
                        disabled={processingItemId === item.id}
                      >
                        {processingItemId === item.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-zinc-100">
                Add Item to Today&apos;s Choice
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAvailableItems([]);
                  setSearchTerm("");
                  setSelectedItemId(null);
                }}
                className="text-zinc-500 hover:text-zinc-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-4 mb-4">
                {/* <button
                  onClick={() => handleItemTypeChange("sticker")}
                  className={`px-4 py-2 rounded ${
                    itemType === "sticker"
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  Stickers
                </button> */}
                <button
                  onClick={() => handleItemTypeChange("part")}
                  className={`px-4 py-2 rounded ${
                    itemType === "part"
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  }`}
                >
                  Parts
                </button>
              </div>

              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Search ${itemType}s...`}
                  className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCurrentPage(0);
                      searchItems(0);
                    }
                  }}
                />
                <Search className="h-5 w-5 absolute left-3 top-2.5 text-zinc-500" />
                <button
                  onClick={() => {
                    setCurrentPage(0);
                    searchItems(0);
                  }}
                  className="absolute right-2 top-2 px-2 py-1 bg-amber-600 text-white text-sm rounded"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Pagination info */}
            {!loadingItems && totalItems > 0 && (
              <div className="text-sm text-zinc-400 mb-2">
                Showing {currentPage * itemsPerPage + 1}-
                {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of{" "}
                {totalItems} items
              </div>
            )}

            <div className="max-h-80 overflow-y-auto mb-4">
              {loadingItems ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  {searchTerm ? "No items found" : "Loading items..."}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center border rounded-md p-3 cursor-pointer ${
                        selectedItemId === item.id
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "hover:bg-zinc-800"
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div className="h-14 w-14 relative mr-3 flex-shrink-0">
                        {item.images && item.images.length > 0 ? (
                          <Image
                            src={item.images[0] || "/512x512.png"}
                            alt={getAvailableItemTitle(item)}
                            fill
                            className="object-cover rounded"
                            unoptimized={true}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/512x512.png";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full w-full bg-zinc-800 rounded text-zinc-500 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium">
                          {getAvailableItemTitle(item)}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          ID: {item.id.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <input
                          type="radio"
                          checked={selectedItemId === item.id}
                          onChange={() => setSelectedItemId(item.id)}
                          className="h-4 w-4 text-amber-400 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination controls */}
            {!loadingItems && totalItems > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    const newPage = currentPage - 1;
                    if (searchTerm.trim()) {
                      searchItems(newPage);
                    } else {
                      handleSearchInitialWithType(itemType, newPage);
                    }
                  }}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-400">
                  Page {currentPage + 1} of{" "}
                  {Math.ceil(totalItems / itemsPerPage)}
                </span>
                <button
                  onClick={() => {
                    const newPage = currentPage + 1;
                    if (searchTerm.trim()) {
                      searchItems(newPage);
                    } else {
                      handleSearchInitialWithType(itemType, newPage);
                    }
                  }}
                  disabled={(currentPage + 1) * itemsPerPage >= totalItems}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAvailableItems([]);
                  setSearchTerm("");
                  setSelectedItemId(null);
                }}
                className="px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={addTodaysChoiceItem}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center"
                disabled={!selectedItemId || processingItemId === "adding"}
              >
                {processingItemId === "adding" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Tag className="h-4 w-4 mr-2" />
                    Add to Today&apos;s Choice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">
              Confirm Removal
            </h3>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to remove &quot;{getItemTitle(itemToDelete)}
              &quot; from Today&apos;s Choice?
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800"
                disabled={processingItemId === itemToDelete.id}
              >
                Cancel
              </button>
              <button
                onClick={deleteItem}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={processingItemId === itemToDelete.id}
              >
                {processingItemId === itemToDelete.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodaysChoice;
