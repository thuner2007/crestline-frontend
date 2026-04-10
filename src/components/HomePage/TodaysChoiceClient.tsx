"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import useAxios from "@/useAxios";
import storage from "@/lib/storage";
import { Sticker } from "@/types/sticker/sticker.type";
import { Part } from "@/app/[locale]/item/[id]/page";

interface TodaysChoiceItem {
  id: string;
  stickerId: string | null;
  partId: string | null;
  createdAt: string;
  sticker?: Sticker;
  part?: Part;
}

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export default function TodaysChoiceClient({ locale }: { locale: string }) {
  const [featuredItems, setFeaturedItems] = useState<TodaysChoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const axiosInstance = useAxios();

  // Use a ref to track if the component is mounted and prevent race conditions
  const isMounted = useRef(true);
  // Use a ref to track if we've already fetched data during this session
  const hasFetched = useRef(false);

  useEffect(() => {
    // Set isMounted to true when the component mounts
    isMounted.current = true;

    // Check if user has consented to cookies before using cached data
    const cookieConsent = storage.getItem("cookieConsent");
    const optionalCookieConsent = storage.getItem("optionalCookieConsent");

    // Only use cache if user has given some form of consent
    if (cookieConsent === "true" || optionalCookieConsent === "true") {
      // Check for cached data
      const cachedData = storage.getItem("todaysChoiceItems");
      const cachedTimestamp = storage.getItem("todaysChoiceTimestamp");

      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);

        // If the cache is still valid
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          try {
            const parsedData = JSON.parse(cachedData);
            setFeaturedItems(parsedData);
            setLoading(false);
            hasFetched.current = true;
            return;
          } catch (e) {
            console.error("Failed to parse cached data:", e);
            // Continue to fetch fresh data
          }
        }
      }
    }

    // Only fetch if we haven't already
    if (!hasFetched.current) {
      fetchFeaturedItems();
    }

    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
    };
    // Empty dependency array - run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFeaturedItems = async () => {
    // Set flag to prevent duplicate fetches
    hasFetched.current = true;

    try {
      const response = await axiosInstance.get<TodaysChoiceItem[]>(
        "/todays-choice"
      );

      if (!isMounted.current) return;

      const itemIds = response.data.map((item: TodaysChoiceItem) => ({
        id: item.id,
        stickerId: item.stickerId,
        partId: item.partId,
        createdAt: item.createdAt,
      }));

      // If we have no items, just return early
      if (itemIds.length === 0) {
        setLoading(false);
        return;
      }

      // Create a map to store each item as we fetch it
      const itemsMap: Record<string, TodaysChoiceItem> = {};

      // Start with basic data
      const initialItems = response.data.map((item: TodaysChoiceItem) => ({
        ...item,
      }));

      // Set the initial items to at least show something
      setFeaturedItems(initialItems);

      // Batch and limit API calls - fetch details in sequence to avoid hitting rate limits
      for (const item of initialItems) {
        if (!isMounted.current) break;

        if (item.stickerId) {
          try {
            const stickerResponse = await axiosInstance.get<Sticker>(
              `/stickers/${item.stickerId}`
            );

            if (!isMounted.current) break;

            const enhancedItem = {
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

            itemsMap[item.id] = enhancedItem;

            // Update the items list with what we have so far
            setFeaturedItems((prev) => {
              const updatedItems = [...prev];
              const index = updatedItems.findIndex((i) => i.id === item.id);
              if (index !== -1) {
                updatedItems[index] = enhancedItem;
              }
              return updatedItems;
            });
          } catch (error) {
            console.error(`Error fetching sticker ${item.stickerId}:`, error);
            // Continue with what we have
          }
        } else if (item.partId) {
          try {
            const partResponse = await axiosInstance.get<Part>(
              `/parts/${item.partId}`
            );

            if (!isMounted.current) break;

            const enhancedItem = {
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

            itemsMap[item.id] = enhancedItem;

            // Update the items list with what we have so far
            setFeaturedItems((prev) => {
              const updatedItems = [...prev];
              const index = updatedItems.findIndex((i) => i.id === item.id);
              if (index !== -1) {
                updatedItems[index] = enhancedItem;
              }
              return updatedItems;
            });
          } catch (error) {
            console.error(`Error fetching part ${item.partId}:`, error);
            // Continue with what we have
          }
        }

        // Add a small delay between requests to help with rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Save to cache only if user has consented
      const cookieConsent = storage.getItem("cookieConsent");
      const optionalCookieConsent = storage.getItem("optionalCookieConsent");

      if (cookieConsent === "true" || optionalCookieConsent === "true") {
        try {
          storage.setItem(
            "todaysChoiceItems",
            JSON.stringify(
              Object.values(itemsMap).length > 0
                ? Object.values(itemsMap)
                : initialItems
            )
          );
          storage.setItem("todaysChoiceTimestamp", Date.now().toString());
        } catch (e) {
          console.error("Failed to cache data:", e);
        }
      }
    } catch (error) {
      console.error("Error fetching today's choice items:", error);
      if (isMounted.current) {
        setError("Failed to load featured items");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Helper function to get item title
  const getItemTitle = (item: TodaysChoiceItem): string => {
    if (item.sticker) {
      const enTranslation = item.sticker.translations.find(
        (t) => t.language === locale || t.language === "en"
      );
      return (
        enTranslation?.title ||
        item.sticker.translations[0]?.title ||
        "Untitled Sticker"
      );
    } else if (item.part) {
      const enTranslation = item.part.translations.find(
        (t) => t.language === locale || t.language === "en"
      );
      return (
        enTranslation?.title ||
        item.part.translations[0]?.title ||
        "Untitled Part"
      );
    }
    return "Featured Item";
  };

  // Rest of the component remains the same...

  // Helper function to get item description
  const getItemDescription = (item: TodaysChoiceItem): string => {
    if (item.sticker) {
      const enTranslation = item.sticker.translations.find(
        (t) => t.language === locale || t.language === "en"
      );
      return (
        enTranslation?.description ||
        item.sticker.translations[0]?.description ||
        ""
      );
    } else if (item.part) {
      const enTranslation = item.part.translations.find(
        (t) => t.language === locale || t.language === "en"
      );
      return (
        enTranslation?.description ||
        item.part.translations[0]?.description ||
        ""
      );
    }
    return "";
  };

  // Helper function to get item price
  const getItemPrice = (item: TodaysChoiceItem): string => {
    if (item.sticker) {
      return `CHF ${parseFloat(item.sticker.pricePerCm2Printable).toFixed(
        2
      )}/cm²`;
    } else if (item.part) {
      if (
        item.part.initialPrice &&
        parseFloat(item.part.initialPrice) > parseFloat(item.part.price)
      ) {
        return `CHF ${parseFloat(item.part.price).toFixed(2)}`;
      }
      return `CHF ${parseFloat(item.part.price).toFixed(2)}`;
    }
    return "";
  };

  // Helper function to get item URL
  const getItemUrl = (item: TodaysChoiceItem): string => {
    if (item.sticker) {
      return `/${locale}/sticker/${item.sticker.id}`;
    } else if (item.part) {
      const translation =
        item.part.translations?.find((t) => t.language === locale) ||
        item.part.translations?.find((t) => t.language === "en");
      const partTitle = translation?.title || item.part.id;
      const urlSlug = partTitle.toLowerCase().replace(/\s+/g, "-");
      return `/${locale}/part/${urlSlug}`;
    }
    return `/${locale}`;
  };

  // Helper function to get item image
  const getItemImage = (item: TodaysChoiceItem): string => {
    if (item.sticker?.images && item.sticker.images.length > 0) {
      return item.sticker.images[0];
    } else if (item.part?.images && item.part.images.length > 0) {
      return item.part.images[0];
    }
    return "/512x512.png";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Ensure we have at least 6 items to display for 3x2 grid (replicate items if needed)
  const displayItems = [...featuredItems];
  // Create a Set to track unique sticker/part IDs to avoid duplicates
  const uniqueIds = new Set();
  displayItems.forEach((item) => {
    if (item.stickerId) uniqueIds.add(item.stickerId);
    if (item.partId) uniqueIds.add(item.partId);
  });

  // Only pad with additional items if we don't have enough and avoid duplicates
  if (displayItems.length < 6 && featuredItems.length > 0) {
    for (const item of featuredItems) {
      // Skip items we already have
      const itemId = item.stickerId || item.partId;
      if (uniqueIds.has(itemId)) continue;

      displayItems.push(item);
      uniqueIds.add(itemId);

      // Stop once we have 6 items
      if (displayItems.length >= 6) break;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {displayItems.slice(0, 6).map((item, index) => (
        <div
          key={`${item.id}-${index}`}
          className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          <Link href={getItemUrl(item)}>
            <div className="overflow-hidden rounded-t-lg bg-gray-50 aspect-square flex items-center justify-center">
              <Image
                src={getItemImage(item) || "/512x512.png"}
                alt={getItemTitle(item)}
                width={200}
                height={200}
                className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300"
                unoptimized={true}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/512x512.png";
                }}
              />
            </div>
            <div className="p-3">
              <h4 className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors truncate text-sm">
                {getItemTitle(item)}
              </h4>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-600 line-clamp-1">
                  {getItemDescription(item).substring(0, 40)}
                  {getItemDescription(item).length > 40 ? "..." : ""}
                </p>
                <div className="flex flex-col items-end">
                  {item.part &&
                  item.part.initialPrice &&
                  parseFloat(item.part.initialPrice) >
                    parseFloat(item.part.price) ? (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-red-600">
                          CHF {parseFloat(item.part.price).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 line-through">
                          CHF {parseFloat(item.part.initialPrice).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded font-medium">
                        {Math.round(
                          ((parseFloat(item.part.initialPrice) -
                            parseFloat(item.part.price)) /
                            parseFloat(item.part.initialPrice)) *
                            100
                        )}
                        % OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-purple-700">
                      {getItemPrice(item)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
