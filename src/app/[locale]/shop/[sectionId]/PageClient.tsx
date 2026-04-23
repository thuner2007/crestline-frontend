"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  Package,
  Flame,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import useAxios from "@/useAxios";
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

interface PartTranslation {
  language: string;
  title: string;
  description?: string | null;
}

interface Part {
  id: string;
  price: string;
  initialPrice?: string;
  images: string[];
  sold: number;
  quantity: number;
  active: boolean;
  sortingRank: number;
  translations: PartTranslation[];
}

interface PartsMeta {
  total: number;
  limit: number;
  skip: number;
  totalPages: number;
}

interface PartsResponse {
  data: Part[];
  meta: PartsMeta;
}

interface SectionTranslation {
  language: string;
  title: string;
  description?: string | null;
}

interface PartSection {
  id: string;
  sortingRank: number;
  translations: SectionTranslation[];
}

const LIMIT = 24;

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

export default function SectionPartsPage() {
  const t = useTranslations("parts");
  const { locale, sectionId } = useParams<{ locale: string; sectionId: string }>();

  const [section, setSection] = useState<PartSection | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [meta, setMeta] = useState<PartsMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const axiosInstance = useAxios();

  const fetchSection = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<PartSection>(`/part-sections/${sectionId}`);
      setSection(data);
    } catch {
      // section title is optional decoration
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const fetchParts = useCallback(async () => {
    const skip = (page - 1) * LIMIT;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get<PartsResponse>("/parts", {
        params: {
          status: "active",
          limit: LIMIT,
          skip,
          sortBy: "sortingRank",
          sortOrder: "asc",
          sectionId,
        },
      });
      setParts(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error("[Shop/Section] Error fetching parts:", err);
      setError(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sectionId]);

  useEffect(() => {
    fetchSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  useEffect(() => {
    fetchParts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchParts]);

  const getSectionTitle = (): string =>
    section?.translations.find((tr) => tr.language === locale)?.title ||
    section?.translations.find((tr) => tr.language === "en")?.title ||
    section?.translations[0]?.title ||
    "";

  const getSectionDescription = (): string =>
    section?.translations.find((tr) => tr.language === locale)?.description ||
    section?.translations.find((tr) => tr.language === "en")?.description ||
    "";

  const getTitle = (part: Part): string =>
    part.translations.find((tr) => tr.language === locale)?.title ||
    part.translations.find((tr) => tr.language === "en")?.title ||
    "";

  const totalPages = meta?.totalPages ?? 1;

  const getPaginationRange = (current: number, total: number): number[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
    if (current >= total - 3)
      return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    return [1, -1, current - 1, current, current + 1, -2, total];
  };

  /* ── LOADING ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={`min-h-[70vh] w-full bg-zinc-950 ${oswald.variable} ${dmSans.variable}`}>
        <div className="border-b border-zinc-800 px-6 py-10 sm:px-10 lg:px-16">
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 bg-zinc-950 px-6 py-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-zinc-950">
              <div className="aspect-square w-full animate-pulse bg-zinc-900" />
              <div className="border-t border-zinc-800 px-4 py-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── ERROR ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className={`flex min-h-[70vh] items-center justify-center bg-zinc-950 px-4 ${oswald.variable} ${dmSans.variable}`}>
        <div className="border border-zinc-800 bg-zinc-900 p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2
            className="mb-2 text-lg font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("errors.title")}
          </h2>
          <p className="mb-6 text-sm text-zinc-400">{error}</p>
          <button
            onClick={fetchParts}
            className="inline-flex items-center gap-2 bg-amber-500 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-amber-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <RefreshCw className="h-4 w-4" />
            {t("errors.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  const sectionTitle = getSectionTitle();
  const sectionDescription = getSectionDescription();

  /* ── MAIN ────────────────────────────────────────────────── */
  return (
    <div
      className={`${oswald.variable} ${dmSans.variable} w-full bg-zinc-950`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div className="border-b border-zinc-800 px-6 py-10 sm:px-10 lg:px-16">
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-amber-400"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <ArrowLeft className="h-3 w-3" />
          {t("browseCategories")}
        </Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {sectionTitle || <span className="text-zinc-600">&hellip;</span>}
            </h1>
            {sectionDescription && (
              <p className="mt-2 text-sm text-zinc-400">{sectionDescription}</p>
            )}
          </div>
          {meta && (
            <span
              className="shrink-0 text-xs font-bold uppercase tracking-widest text-zinc-500"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {meta.total} {meta.total === 1 ? "part" : "parts"}
            </span>
          )}
        </div>
      </div>

      {/* ── PARTS GRID ──────────────────────────────────────── */}
      <section>
        {parts.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center px-6">
            <div className="text-center">
              <Package className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
              <h2
                className="text-lg font-bold uppercase tracking-wide text-zinc-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("noParts")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{t("noPartsDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 bg-zinc-950 px-6 py-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {parts.map((part) => {
              const title = getTitle(part);
              const slug = slugify(title);
              const firstImage = part.images[0];
              const imageUrl = firstImage ? getImageUrl(firstImage) : null;
              const price = parseFloat(part.price);
              const initialPrice = part.initialPrice ? parseFloat(part.initialPrice) : null;
              const isOnSale = initialPrice !== null && initialPrice > price;
              const isSoldOut = part.quantity === 0;

              return (
                <Link
                  key={part.id}
                  href={`/${locale}/item/${slug}`}
                  className="group relative flex flex-col border border-zinc-800 bg-zinc-900 transition-colors duration-200 hover:border-amber-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16.6vw"
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
                          {t("outOfStock")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between border-t border-zinc-800 px-3 py-3 transition-colors duration-200 group-hover:border-amber-500/30 sm:px-4">
                    <h2
                      className="line-clamp-2 text-xs font-bold uppercase leading-tight tracking-wide text-zinc-300 transition-colors duration-200 group-hover:text-white sm:text-sm"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {title || t("unnamedGroup")}
                    </h2>
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
                        {isSoldOut ? "—" : t("inStock")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── PAGINATION ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="border-t border-zinc-800 px-6 py-8 sm:px-10">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-500 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPaginationRange(page, totalPages).map((p, idx) =>
              p < 0 ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-9 w-9 items-center justify-center text-xs text-zinc-600"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-9 w-9 items-center justify-center text-xs font-bold uppercase tracking-wide transition-colors ${
                    p === page
                      ? "bg-amber-500 text-zinc-950"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-500 hover:text-amber-400"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p}
                </button>
              ),
            )}

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-500 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p
            className="mt-3 text-center text-xs uppercase tracking-widest text-zinc-600"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Page {page} / {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
