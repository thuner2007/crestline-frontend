"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowRight, Tag } from "lucide-react";
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

export default function ShopLandingPage() {
  const t = useTranslations("parts");
  const { locale } = useParams<{ locale: string }>();

  const [sections, setSections] = useState<PartSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const axiosInstance = useAxios();

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get<PartSection[]>("/part-sections");
      setSections(data);
    } catch (err) {
      console.error("[Shop] Error fetching sections:", err);
      setError(t("errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = (section: PartSection): string =>
    section.translations.find((tr) => tr.language === locale)?.title ||
    section.translations.find((tr) => tr.language === "en")?.title ||
    section.translations[0]?.title ||
    "";

  const getDescription = (section: PartSection): string =>
    section.translations.find((tr) => tr.language === locale)?.description ||
    section.translations.find((tr) => tr.language === "en")?.description ||
    "";

  /* LOADING */
  if (loading) {
    return (
      <div className={`min-h-[70vh] w-full bg-zinc-950 ${oswald.variable} ${dmSans.variable}`}>
        <div className="border-b border-zinc-800 px-6 py-16 sm:px-10 lg:px-16">
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="divide-y divide-zinc-800/60">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-6 py-10 sm:px-10 lg:px-16">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded bg-zinc-800" />
              <div className="flex-1">
                <div className="h-6 w-1/3 animate-pulse rounded bg-zinc-800" />
                <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ERROR */
  if (error) {
    return (
      <div className={`flex min-h-[70vh] items-center justify-center bg-zinc-950 px-4 ${oswald.variable} ${dmSans.variable}`}>
        <div className="border border-zinc-800 bg-zinc-900 p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="mb-2 text-lg font-bold uppercase tracking-wide text-white" style={{ fontFamily: "var(--font-display)" }}>
            {t("errors.title")}
          </h2>
          <p className="mb-6 text-sm text-zinc-400">{error}</p>
          <button
            onClick={fetchSections}
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

  /* MAIN */
  return (
    <div className={`${oswald.variable} ${dmSans.variable} w-full bg-zinc-950`} style={{ fontFamily: "var(--font-body)" }}>

      {/* HERO HEADER */}
      <div className="relative overflow-hidden border-b border-zinc-800 px-6 py-16 sm:px-10 lg:px-16">
        {/* Dot-grid atmosphere */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(245,158,11,0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative">
          <p
            className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="h-px w-8 bg-amber-400" />
            {t("browseCategories")}
          </p>
          <h1
            className="mt-3 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("partsTitle") || "Supermoto"}{" "}
            <span className="text-amber-400">Parts</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-500">
            {t("browseCategoriesDesc")}
          </p>
        </div>
      </div>

      {/* SECTIONS GRID */}
      {sections.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center px-6">
          <p className="text-sm uppercase tracking-widest text-zinc-600" style={{ fontFamily: "var(--font-display)" }}>
            {t("noParts")}
          </p>
        </div>
      ) : (
        <div className="px-6 py-12 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const title = getTitle(section);
              const description = getDescription(section);

              return (
                <Link
                  key={section.id}
                  href={`/${locale}/shop/${section.id}`}
                  className="group flex flex-col border border-zinc-800 bg-zinc-900 p-6 transition-all duration-200 hover:border-amber-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {/* Icon row */}
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-800 text-zinc-500 transition-colors duration-200 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 group-hover:text-amber-400">
                      <Tag className="h-4 w-4" />
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center border border-zinc-700 bg-zinc-800 text-zinc-600 transition-all duration-200 group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-zinc-950">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Text */}
                  <div className="mt-5">
                    <h2
                      className="text-base font-bold uppercase tracking-tight text-white transition-colors duration-200 group-hover:text-amber-400 sm:text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {title}
                    </h2>
                    {description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
                        {description}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors duration-200 group-hover:text-amber-400" style={{ fontFamily: "var(--font-display)" }}>
                    {t("explore")}
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
