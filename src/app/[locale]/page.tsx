import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ShieldCheck, Zap, Globe, CloudRain } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { Oswald, DM_Sans } from "next/font/google";
import {
  createLocalBusinessSchema,
  createNavigationSchema,
  createBreadcrumbSchema,
  createHomepageProductSchema,
} from "@/lib/schema";
import "../globals.css";

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

// Dynamic imports for below-the-fold components to improve TTI
const PartGroupsGrid = dynamic(
  () => import("@/components/HomePage/PartGroupsGrid"),
  { ssr: true },
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    metadataBase: new URL("https://revsticks.ch"),
    title: t("home.title"),
    description: t("home.description"),
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/192x192.png" }],
      shortcut: [{ url: "/favicon.ico" }],
    },
    other: {
      "google-site-verification": "SLWpYJkNE6rPkbVtZT9ePJKdlZZpMaHW59YxSd_HvMg",
    },
    openGraph: {
      title: t("home.title"),
      description: t("home.description"),
      images: [
        { url: "/512x512.png", width: 1200, height: 630, alt: "Logo" },
      ],
      type: "website",
      siteName: "Crestline",
      locale:
        locale === "en"
          ? "en_US"
          : locale === "de"
            ? "de_CH"
            : locale === "fr"
              ? "fr_CH"
              : locale === "it"
                ? "it_CH"
                : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("home.title"),
      description: t("home.description"),
      images: ["/512x512.png"],
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}`,
      languages: {
        "x-default": "https://revsticks.ch/en",
        en: "https://revsticks.ch/en",
        de: "https://revsticks.ch/de",
        fr: "https://revsticks.ch/fr",
        it: "https://revsticks.ch/it",
      },
    },
  };
}

export default async function LandingPage() {
  const t = await getTranslations("homepage");
  const nav = await getTranslations("navigation");
  const locale = await getLocale();

  const localBusinessSchema = createLocalBusinessSchema(
    t("subtitle") || "Magnetic plate holders from Switzerland",
  );

  const navigationSchema = createNavigationSchema([
    { name: nav("parts"), url: `https://revsticks.ch/${locale}/parts` },
    { name: nav("login"), url: `https://revsticks.ch/${locale}/login` },
    { name: nav("register"), url: `https://revsticks.ch/${locale}/register` },
  ]);

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://revsticks.ch" },
  ]);

  const productSchema = createHomepageProductSchema(locale, {
    stickers: "Plate Holders",
    stickersDescription: "Premium quality plate holders for cars",
    supermotoParts: t("supermotoParts"),
    superMotoPartsDescription:
      t("superMotoPartsDescription") ||
      "High-quality plate holders and car accessories",
  });

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={navigationSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={productSchema} />

      <div
        className={`flex-grow overflow-hidden ${oswald.variable} ${dmSans.variable}`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* ── HERO ─────────────────────────────────────────────── */}
        <section
          className="relative flex min-h-[92vh] items-center overflow-hidden bg-zinc-950"
          aria-label="Hero Section"
        >
          {/* Amber dot-grid atmosphere */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(245,158,11,0.18) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Text */}
              <div className="min-w-0 space-y-8">
                <p
                  className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="h-px w-10 bg-amber-400" />
                  Premium Car Accessories
                </p>

                <h1
                  className="break-words text-5xl font-bold uppercase leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("heroTitle") || "Premium"}{" "}
                  <span className="text-amber-400">
                    {t("heroSubtitle") || "Plate Holders"}
                  </span>
                  <br />
                  <span className="text-2xl font-normal text-zinc-400 md:text-3xl lg:text-4xl">
                    &amp; Stickers
                  </span>
                </h1>

                <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
                  {t("heroDescription") ||
                    "Precision-crafted plate holders designed in Switzerland. Easy installation, weather-resistant, and built to last. Plus custom stickers for any surface."}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href={`/${locale}/shop`}
                    className="group inline-flex items-center gap-2 bg-amber-500 px-8 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all duration-300 hover:bg-amber-400 hover:shadow-[0_0_60px_rgba(245,158,11,0.45)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("shopParts") || "Shop Now"}
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href={`/${locale}/parts`}
                    className="inline-flex items-center gap-2 border border-zinc-700 px-8 py-4 text-sm font-bold uppercase tracking-widest text-zinc-300 transition-all duration-300 hover:border-amber-500/60 hover:text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("browseCategories") || "Browse All"}
                  </Link>
                </div>

                {/* Stickers teaser pill */}
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-block h-px w-6 bg-zinc-700" />
                  Also available:{" "}
                  <Link
                    href={`/${locale}/shop`}
                    className="font-semibold text-amber-500/80 underline-offset-2 hover:text-amber-400 hover:underline"
                  >
                    Car Stickers
                  </Link>
                </p>
              </div>

              {/* Product image */}
              <div className="relative hidden lg:block">
                {/* Offset accent border */}
                <div className="absolute -right-3 -top-3 h-full w-full border border-amber-500/20" />
                {/* Amber left stripe */}
                <div className="absolute inset-y-0 left-0 z-10 w-1 bg-amber-500" />
                <div className="relative overflow-hidden bg-zinc-900">
                  <Image
                    src="/productimage_plateholder.jpg"
                    alt="Crestline Customs plate holder"
                    width={600}
                    height={700}
                    className="h-[560px] w-full object-cover opacity-90"
                    priority
                    quality={90}
                  />
                  {/* Placeholder shown behind the image while no photo exists */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
                    <div className="flex h-20 w-20 items-center justify-center border-2 border-dashed border-zinc-700">
                      <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p
                      className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Add your product image here
                    </p>
                    <p className="text-xs text-zinc-700">
                      /public/productimage_plateholder.jpg
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── USP BAR ──────────────────────────────────────────── */}
        <div className="border-b border-zinc-800 bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 md:gap-x-14">
              {[
                "No Drilling",
                "Waterproof 3M Tape",
                "Magnetic Snap",
                "Stickers",
                "Swiss Made",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span
                    className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-300"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PRODUCT CATEGORIES ────────────────────────────────── */}
        <section className="bg-zinc-950 py-20 md:py-28" aria-labelledby="product-categories-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                — what we offer
              </p>
              <h2
                id="product-categories-heading"
                className="mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Two Products,{" "}
                <span className="text-amber-400">One Brand</span>
              </h2>
            </div>

            <div className="grid gap-px bg-zinc-800 md:grid-cols-5">
              {/* Plate Holders — primary, 3/5 width */}
              <div className="group relative col-span-3 overflow-hidden bg-zinc-900 p-10">
                {/* Amber left accent */}
                <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
                <div className="absolute right-6 top-6">
                  <span
                    className="inline-block bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-950"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Most Popular
                  </span>
                </div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  #1 Product
                </p>
                <h3
                  className="mt-3 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Magnetic<br />
                  <span className="text-amber-400">Plate Holders</span>
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                  Stick the base to your plate once with waterproof 3M tape — that&apos;s the only step that needs tools. From there, the holder snaps on magnetically and comes off just as easily, whenever you want.
                </p>
                <ul className="mt-6 space-y-2">
                  {["Waterproof double-sided 3M tape base", "Magnetic snap — on & off in seconds", "Works with EU & Swiss plates"].map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${locale}/shop`}
                  className="group/btn mt-8 inline-flex items-center gap-2 bg-amber-500 px-7 py-3 text-xs font-bold uppercase tracking-widest text-zinc-950 transition-all hover:bg-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shop Plate Holders
                  <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Stickers — secondary, 2/5 width */}
              <div className="group relative col-span-2 overflow-hidden bg-zinc-900/60 p-10">
                <div className="absolute inset-y-0 left-0 w-px bg-zinc-700" />
                <p
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Also Available
                </p>
                <h3
                  className="mt-3 text-2xl font-bold uppercase tracking-tight text-white md:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="text-zinc-300">Stickers</span>
                </h3>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
                  Personalize your car with high-quality vinyl stickers. Durable, vibrant, and cut to any shape.
                </p>
                <ul className="mt-6 space-y-2">
                  {["Precision die-cut vinyl", "Weather & fade resistant", "Multiple sizes available"].map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${locale}/shop`}
                  className="mt-8 inline-flex items-center gap-2 border border-zinc-700 px-7 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Browse Stickers
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section className="bg-white py-24 md:py-32" aria-labelledby="how-it-works-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16">
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500"
                style={{ fontFamily: "var(--font-display)" }}
              >
                — Simple Setup
              </p>
              <h2
                id="how-it-works-heading"
                className="mt-2 text-3xl font-bold uppercase tracking-tight text-zinc-900 md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How It <span className="text-amber-500">Works</span>
              </h2>
              <p className="mt-3 max-w-xl text-zinc-500">
                Install takes under a minute. After that, snap it on and off whenever you feel like it.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px bg-zinc-200 md:grid-cols-3">
              <div className="bg-white p-10">
                <span
                  className="block text-8xl font-black leading-none text-zinc-100"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  01
                </span>
                <div className="mt-4 h-0.5 w-12 bg-amber-500" />
                <h3
                  className="mt-4 text-lg font-bold uppercase tracking-wide text-zinc-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Browse &amp; Order
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Pick the plate holder that fits your style. Multiple designs in our shop.
                </p>
              </div>

              <div className="bg-zinc-50 p-10">
                <span
                  className="block text-8xl font-black leading-none text-amber-500/10"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  02
                </span>
                <div className="mt-4 h-0.5 w-12 bg-amber-500" />
                <h3
                  className="mt-4 text-lg font-bold uppercase tracking-wide text-zinc-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Stick the Base
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Peel the waterproof 3M tape and press the base firmly onto your license plate. Done in 30 seconds, holds for years.
                </p>
              </div>

              <div className="bg-white p-10">
                <span
                  className="block text-8xl font-black leading-none text-zinc-100"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  03
                </span>
                <div className="mt-4 h-0.5 w-12 bg-amber-500" />
                <h3
                  className="mt-4 text-lg font-bold uppercase tracking-wide text-zinc-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Snap On &amp; Off
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  The holder clicks onto the base magnetically. Remove it, put it back — takes a second, every time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOP OUR PRODUCTS ─────────────────────────────────── */}
        <section
          className="bg-zinc-950 py-24 md:py-32"
          aria-labelledby="part-categories-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  — our shop
                </p>
                <h2
                  id="part-categories-heading"
                  className="mt-2 text-4xl font-bold uppercase tracking-tight text-white md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shop Our{" "}
                  <span className="text-amber-400">Products</span>
                </h2>
                <p className="mt-3 text-zinc-400">
                  Premium magnetic plate holders — find the style that fits your car.
                </p>
              </div>
              <Link
                href={`/${locale}/parts`}
                className="group inline-flex shrink-0 items-center gap-2 border border-zinc-700 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-all hover:border-amber-500 hover:text-amber-400"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("shopAllParts") || "All Products"}
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <PartGroupsGrid locale={locale} />
          </div>
        </section>

        {/* ── CTA BAND ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-amber-500 py-20 md:py-24">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className="text-3xl font-bold uppercase tracking-tight text-zinc-950 md:text-4xl lg:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("ctaReady") || "Ready to upgrade your car?"}
                </h2>
                <p className="mt-2 max-w-md text-zinc-800">
                  {t("ctaDescription") || "Browse our full range of magnetic plate holders and custom stickers."}
                </p>
              </div>
              <Link
                href={`/${locale}/shop`}
                className="group inline-flex shrink-0 items-center gap-3 bg-zinc-950 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-zinc-800"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("shopParts") || "Shop Now"}
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE US + TRUST ──────────────────────────────── */}
        <section
          className="bg-white py-24 md:py-32"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500"
                style={{ fontFamily: "var(--font-display)" }}
              >
                — our promise
              </p>
              <h2
                id="features-heading"
                className="mt-2 text-3xl font-bold uppercase tracking-tight text-zinc-900 md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("whyChooseUsTitle") || "Why Choose Us"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-200 lg:grid-cols-4">
              {[
                {
                  icon: Zap,
                  label: "No Drilling",
                  desc: "Magnetic attachment — no marks, no damage, no tools.",
                },
                {
                  icon: Globe,
                  label: "Universal Fit",
                  desc: "Works with all standard EU and Swiss license plates.",
                },
                {
                  icon: CloudRain,
                  label: "Weatherproof",
                  desc: "Handles rain, heat, and cold all year round.",
                },
                {
                  icon: ShieldCheck,
                  label: t("swissBrand") || "Swiss Made",
                  desc: t("swissBrandText") || "Designed & tested in Switzerland.",
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-white p-8 text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center bg-amber-500/10">
                    <Icon className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  </div>
                  <h3
                    className="text-sm font-bold uppercase tracking-wide text-zinc-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {label}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 border border-zinc-100 bg-zinc-50 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-amber-500 text-lg">
                  🔒
                </div>
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wide text-zinc-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("securePayment") || "Secure Payment"}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("securePaymentText") || "SSL encrypted & PCI compliant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 border border-zinc-100 bg-zinc-50 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-amber-500 text-lg">
                  🛡️
                </div>
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wide text-zinc-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("dataProtection") || "Data Protected"}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("dataProtectionText") || "GDPR compliant"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
