"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Flame } from "lucide-react";
import { motion } from "framer-motion";
import useAxios from "@/useAxios";

interface PartTranslation {
  language: string;
  title: string;
}

interface Part {
  id: string;
  price: string;
  initialPrice?: string;
  images: string[];
  sold: number;
  quantity: number;
  translations: PartTranslation[];
}

interface PartsResponse {
  data: Part[];
}

interface PartGroupsGridProps {
  locale: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getImageUrl(img: string): string {
  return img.startsWith("http")
    ? img
    : `https://minio-api.cwx-dev.com/parts/${img}`;
}

export default function PartGroupsGrid({ locale }: PartGroupsGridProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const axiosInstance = useAxios();

  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get<PartsResponse>("/parts", {
          params: {
            status: "active",
            limit: 8,
            skip: 0,
            sortBy: "sortingRank",
            sortOrder: "asc",
          },
        });
        setParts(data.data);
      } catch (error) {
        console.error("Error fetching parts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-px bg-zinc-800 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col bg-zinc-900 animate-pulse">
            <div className="aspect-square w-full bg-zinc-800" />
            <div className="border-t border-zinc-800 px-4 py-3">
              <div className="h-3 w-3/4 bg-zinc-800" />
              <div className="mt-2 h-3 w-1/3 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (parts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-px bg-zinc-800 sm:grid-cols-3 lg:grid-cols-4">
      {parts.map((part, idx) => {
        const translation =
          part.translations.find((tr) => tr.language === locale) ||
          part.translations.find((tr) => tr.language === "en") ||
          part.translations[0];
        const title = translation?.title || "";
        const slug = slugify(title);
        const firstImage = part.images[0];
        const imageUrl = firstImage ? getImageUrl(firstImage) : null;
        const price = parseFloat(part.price);
        const initialPrice = part.initialPrice
          ? parseFloat(part.initialPrice)
          : null;
        const isOnSale = initialPrice !== null && initialPrice > price;
        const isSoldOut = part.quantity === 0;

        return (
          <motion.div
            key={part.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.04 }}
          >
            <Link
              href={`/${locale}/item/${slug}`}
              className="group relative flex flex-col bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 transition-colors duration-200 hover:bg-zinc-800"
            >
              {/* Amber left accent */}
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />

              {/* Image */}
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                      isSoldOut
                        ? "opacity-40 grayscale"
                        : "opacity-80 group-hover:opacity-100"
                    }`}
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/512x512.png";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-8 w-8 text-zinc-700" />
                  </div>
                )}

                {/* Hover amber tint */}
                <div className="absolute inset-0 bg-amber-500/0 transition-colors duration-300 group-hover:bg-amber-500/10" />

                {/* Badges */}
                <div className="absolute left-2 top-2 flex flex-col gap-1">
                  {isOnSale && (
                    <span
                      className="inline-flex items-center bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {Math.round(((initialPrice! - price) / initialPrice!) * 100)}% OFF
                    </span>
                  )}
                  {part.sold > 0 && (
                    <span
                      className="inline-flex items-center gap-1 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 backdrop-blur-sm"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <Flame className="h-2.5 w-2.5" />
                      {part.sold}
                    </span>
                  )}
                  {isSoldOut && (
                    <span
                      className="inline-flex items-center bg-zinc-900/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 backdrop-blur-sm"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Sold Out
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between border-t border-zinc-800 px-3 py-3 transition-colors duration-200 group-hover:border-amber-500/30 sm:px-4">
                <h3
                  className="line-clamp-2 text-xs font-bold uppercase leading-tight tracking-wide text-zinc-300 transition-colors duration-200 group-hover:text-white sm:text-sm"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-sm font-bold sm:text-base ${isOnSale ? "text-red-400" : "text-amber-400"}`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      CHF {price.toFixed(2)}
                    </span>
                    {isOnSale && (
                      <span className="text-[10px] text-zinc-600 line-through">
                        {initialPrice!.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      isSoldOut ? "text-zinc-600" : "text-green-500"
                    }`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {isSoldOut ? "—" : "In Stock"}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
