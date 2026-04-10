import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PartPageClient from "./PageClient";
import { JsonLd } from "@/components/JsonLd";
import {
  createProductSchema,
  createBreadcrumbSchema,
  createVideoObjectSchema,
} from "@/lib/schema";

// Helper function to parse keywords from backend format
function parseKeywords(keywords?: string[]): string[] {
  if (!keywords || keywords.length === 0) return [];

  console.log("Parsing keywords array:", JSON.stringify(keywords));

  // Direct regex extraction approach - most reliable for the format seen
  try {
    const extractedKeywords: string[] = [];

    // Loop through each item in the array
    keywords.forEach((item) => {
      // Extract text between double quotes
      const matches = item.match(/"([^"]+)"/g);
      if (matches) {
        matches.forEach((match) => {
          // Remove the quotes
          const keyword = match.replace(/^"|"$/g, "");
          if (keyword) extractedKeywords.push(keyword);
        });
      }
    });

    console.log("Extracted keywords via regex:", extractedKeywords);
    return extractedKeywords;
  } catch (regexError) {
    console.error("Error extracting keywords with regex:", regexError);

    // Last resort: try standard JSON parse with different formatting
    try {
      // Join and clean the format
      const joined = keywords.join("");
      // Replace double array notation if exists
      const cleaned = joined.replace(/^\[\[|\]\]$/g, "[").replace(/\]\[/g, ",");
      // Ensure it's a valid JSON array
      const jsonStr = cleaned.startsWith("[") ? cleaned : `[${cleaned}`;
      const jsonEnd = jsonStr.endsWith("]") ? jsonStr : `${jsonStr}]`;

      console.log("Attempting JSON parse with:", jsonEnd);
      const parsed = JSON.parse(jsonEnd);
      return Array.isArray(parsed) ? parsed : [];
    } catch (jsonError) {
      console.error("Final JSON parsing attempt failed:", jsonError);
      return [];
    }
  }
}

interface PartTranslation {
  id: string;
  partId: string;
  language: string;
  title: string;
  description: string | null;
}

interface PartGroup {
  id: string;
  createdAt: string;
  image: string | null;
  translations?: Array<{
    language: string;
    title: string;
  }>;
}

interface CustomizationOption {
  type: string;
  translations: {
    en: { title: string; description: string };
    de: { title: string; description: string };
    fr: { title: string; description: string };
    it: { title: string; description: string };
  };
  priceAdjustment?: number;
  max?: number;
  items?: Array<{
    id: string;
    priceAdjustment: number;
    stock?: number; // Add stock information for dropdown items
    translations: {
      en: { title: string; description?: string };
      de: { title: string; description?: string };
      fr: { title: string; description?: string };
      it: { title: string; description?: string };
    };
  }>;
}

interface Accessory {
  id: string;
  price: string;
  quantity: number;
  images: string[];
  active: boolean;
  translations: Array<{
    language: string;
    title: string;
    description?: string;
  }>;
}

export interface Part {
  id: string;
  price: string;
  initialPrice?: string;
  quantity: number;
  type?: string;
  customizationOptions: {
    options: CustomizationOption[];
  };
  images: string[];
  videos?: string[];
  sold: number;
  sortingRank: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
  translations: PartTranslation[];
  groups: PartGroup[];
  keywords?: string[];
  shippingReady: [
    | "now"
    | "in_1_3_days"
    | "in_4_7_days"
    | "in_8_14_days"
    | "unknown"
    | "pre_order",
  ];
  shippingDate?: string;
  accessories?: Accessory[];
  bikeModels?: Array<{
    id: string;
    manufacturer: string;
    model: string;
    year: number | null;
    active: boolean;
  }>;
}

async function fetchPart(partIdentifier: string): Promise<Part | null> {
  try {
    // Try fetching by name first (convert hyphens back to spaces)
    const partName = decodeURIComponent(partIdentifier.replace(/-/g, " "));
    const endpoint = `/parts/by-name/${encodeURIComponent(partName)}`;

    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:1111"}${endpoint}`,
      {
     cache: "no-store", // Ensure fresh data for metadata
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch part");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching part for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getTranslations({ locale, namespace: "metadata" });

  // Fetch the part data for dynamic metadata
  const part = await fetchPart(resolvedParams.id);

  // Find translation for the current locale
  const translation =
    part?.translations?.find((t) => t.language === locale) ||
    part?.translations?.find((t) => t.language === "en");

  // Get the part title or fallback to generic title
  const partTitle = translation?.title || t("part.title");
  const partDescription = translation?.description || t("part.description");

  // Get the first image or fallback to logo
  const firstImage = part?.images?.[0];
  const imageUrl = firstImage
    ? firstImage.startsWith("http")
      ? firstImage
      : `https://minio-api.cwx-dev.com/parts/${firstImage}`
    : "https://revsticks.ch/512x512.png";

  // Parse keywords from backend format
  const parsedKeywords = parseKeywords(part?.keywords);

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

  // Create URL slug from part title
  const urlSlug = partTitle.toLowerCase().replace(/\s+/g, "-");

  return {
    title: partTitle + " | RevSticks" || t("part.title"),
    description: partDescription || t("part.description"),
    keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: partTitle,
      description: partDescription,
      type: "article",
      url: `https://revsticks.ch/${locale}/part/${urlSlug}`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: partTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: partTitle,
      description: partDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/part/${urlSlug}`,
      languages: {
        "x-default": `https://revsticks.ch/en/part/${urlSlug}`,
        en: `https://revsticks.ch/en/part/${urlSlug}`,
        de: `https://revsticks.ch/de/part/${urlSlug}`,
        fr: `https://revsticks.ch/fr/part/${urlSlug}`,
        it: `https://revsticks.ch/it/part/${urlSlug}`,
      },
    },
  };
}

export default async function PartPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tMetadata = await getTranslations({ locale, namespace: "metadata" });

  // Fetch part data for JSON-LD
  const part = await fetchPart(resolvedParams.id);

  // Get translation for URL slug
  const translation =
    part?.translations?.find((t) => t.language === locale) ||
    part?.translations?.find((t) => t.language === "en");
  const partTitle = translation?.title || tMetadata("part.title");
  const urlSlug = partTitle.toLowerCase().replace(/\s+/g, "-");

  // Create JSON-LD schemas
  const schemas = [];

  // Breadcrumb schema
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tCommon("home"), url: `https://revsticks.ch/${locale}` },
    { name: tCommon("parts"), url: `https://revsticks.ch/${locale}/parts` },
    {
      name: partTitle,
      url: `https://revsticks.ch/${locale}/part/${urlSlug}`,
    },
  ]);
  schemas.push(breadcrumbSchema);

  // Product schema if part exists
  if (part) {
    const partDescription = translation?.description || tMetadata("part.description");

    const firstImage = part.images?.[0];
    const imageUrl = firstImage
      ? firstImage.startsWith("http")
        ? firstImage
        : `https://minio-api.cwx-dev.com/parts/${firstImage}`
      : "https://revsticks.ch/512x512.png";

    const productSchema = createProductSchema({
      name: partTitle,
      description: partDescription,
      url: `https://revsticks.ch/${locale}/part/${urlSlug}`,
      image: imageUrl,
      sku: `PART-${resolvedParams.id}`,
      price: part.price,
      currency: "CHF",
      availability: part.quantity > 0 ? "InStock" : "OutOfStock",
      condition: "NewCondition",
    });
    schemas.push(productSchema);

    // Add VideoObject schemas if part has videos
    if (part.videos && part.videos.length > 0) {
      part.videos.forEach((video, index) => {
        const videoUrl = video.startsWith("http")
          ? video
          : `https://minio-api.cwx-dev.com/parts/${video}`;

        const videoSchema = createVideoObjectSchema({
          name: `${partTitle}${
            part.videos!.length > 1 ? ` - Video ${index + 1}` : ""
          }`,
          description: partDescription || `${partTitle} product video`,
          thumbnailUrl: imageUrl,
          uploadDate:
            part.updatedAt || part.createdAt || new Date().toISOString(),
          contentUrl: videoUrl,
        });
        schemas.push(videoSchema);
      });
    }
  }

  return (
    <>
      {schemas.map((schema, index) => (
        <JsonLd key={index} data={schema} />
      ))}
      <PartPageClient initialPart={part} />
    </>
  );
}
