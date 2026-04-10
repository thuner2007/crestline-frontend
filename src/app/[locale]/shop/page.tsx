import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import {
  createBreadcrumbSchema,
  createCollectionPageSchema,
} from "@/lib/schema";

// Dynamic import for client component to improve TTI
const PageClient = dynamic(() => import("./PageClient"), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  // Map locale to proper OpenGraph locale format
  const ogLocaleMap: Record<string, string> = {
    en: "en_US",
    de: "de_CH",
    fr: "fr_CH",
    it: "it_CH",
  };

  const alternateLocales = Object.keys(ogLocaleMap)
    .filter((loc) => loc !== locale)
    .map((loc) => ogLocaleMap[loc]);

  return {
    title: t("parts.title"),
    description: t("parts.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("parts.title"),
      description: t("parts.description"),
      images: [
        {
          url: "/supermotosheet.webp",
          width: 1200,
          height: 630,
          alt: "RevSticks Supermoto Parts",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/parts`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("parts.title"),
      description: t("parts.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/parts`,
      languages: {
        "x-default": "https://revsticks.ch/en/parts",
        en: "https://revsticks.ch/en/parts",
        de: "https://revsticks.ch/de/parts",
        fr: "https://revsticks.ch/fr/parts",
        it: "https://revsticks.ch/it/parts",
      },
    },
  };
}

export default async function PartsPage() {
  const t = await getTranslations("parts");
  const locale = await getLocale();

  // Create structured data for parts collection page
  const breadcrumbSchema = createBreadcrumbSchema([
    {
      name: "Home",
      url: "https://revsticks.ch",
    },
    {
      name: t("partsTitle") || "Parts",
    },
  ]);

  const collectionPageSchema = createCollectionPageSchema(
    t("partsTitle") || "Supermoto Parts",
    t("partsDescription") || "High-quality supermoto parts and accessories",
    `https://revsticks.ch/${locale}/parts`,
    locale
  );

  return (
    <>
      {/* Parts page structured data */}
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={collectionPageSchema} />

      <PageClient />
    </>
  );
}
