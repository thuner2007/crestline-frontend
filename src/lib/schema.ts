import type {
  OrganizationSchema,
  WebSiteSchema,
  WebPageSchema,
  CollectionPageSchema,
  LocalBusinessSchema,
  ProductSchema,
  BreadcrumbListSchema,
  SiteNavigationElementSchema,
  ItemListSchema,
  VideoObjectSchema,
} from "@/types/schema";

// Base URL for your site
const BASE_URL = "https://revsticks.ch";

/**
 * Create Organization schema for RevSticks
 */
export const createOrganizationSchema = (): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RevSticks",
  url: BASE_URL,
  logo: `${BASE_URL}/512x512.png`,
  sameAs: [
    "https://www.instagram.com/rev.sticks",
    "https://www.tiktok.com/@revsticks",
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "CH",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

/**
 * Create Website schema for RevSticks
 */
export const createWebsiteSchema = (): WebSiteSchema => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "RevSticks",
  alternateName: "RevSticks Switzerland",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

/**
 * Create WebPage schema
 */
export const createWebPageSchema = (
  name: string,
  description: string,
  url: string,
  locale = "en",
): WebPageSchema => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name,
  description,
  url,
  isPartOf: {
    "@type": "WebSite",
    name: "RevSticks",
    url: BASE_URL,
  },
  inLanguage:
    locale === "en"
      ? "en-US"
      : locale === "de"
        ? "de-CH"
        : locale === "fr"
          ? "fr-CH"
          : locale === "it"
            ? "it-CH"
            : "en-US",
});

/**
 * Create CollectionPage schema (for product listings)
 */
export const createCollectionPageSchema = (
  name: string,
  description: string,
  url: string,
  locale = "en",
): CollectionPageSchema => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  description,
  url,
  isPartOf: {
    "@type": "WebSite",
    name: "RevSticks",
    url: BASE_URL,
  },
  inLanguage:
    locale === "en"
      ? "en-US"
      : locale === "de"
        ? "de-CH"
        : locale === "fr"
          ? "fr-CH"
          : locale === "it"
            ? "it-CH"
            : "en-US",
});

/**
 * Create Local Business schema for RevSticks
 */
export const createLocalBusinessSchema = (
  description: string,
): LocalBusinessSchema => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "RevSticks",
  description,
  url: BASE_URL,
  logo: `${BASE_URL}/512x512.png`,
  address: {
    "@type": "PostalAddress",
    addressCountry: "CH",
  },
  sameAs: [
    "https://www.instagram.com/rev.sticks",
    "https://www.tiktok.com/@revsticks",
  ],
});

/**
 * Create Product schema
 */
export const createProductSchema = (product: {
  name: string;
  description: string;
  price?: string;
  currency?: string;
  image?: string;
  url?: string;
  availability?: string;
  sku?: string;
  condition?: string;
  brand?: string;
}): ProductSchema => {
  // Ensure price is properly formatted as a string with 2 decimal places
  const formattedPrice = product.price
    ? parseFloat(product.price).toFixed(2)
    : undefined;

  // Map availability string to schema.org format
  const availabilityUrl = product.availability
    ? product.availability.startsWith("http")
      ? product.availability
      : `https://schema.org/${product.availability}`
    : "https://schema.org/InStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    url: product.url,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: "RevSticks",
    },
    offers: formattedPrice
      ? {
          "@type": "Offer",
          price: formattedPrice,
          priceCurrency: product.currency || "CHF",
          availability: availabilityUrl,
          url: product.url,
          seller: {
            "@type": "Organization",
            name: "RevSticks",
          },
          priceValidUntil: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          )
            .toISOString()
            .split("T")[0], // Valid for 1 year
        }
      : undefined,
    itemCondition: product.condition
      ? `https://schema.org/${product.condition}`
      : "https://schema.org/NewCondition",
  };
};

/**
 * Create Breadcrumb schema
 */
export const createBreadcrumbSchema = (
  items: Array<{ name: string; url?: string }>,
): BreadcrumbListSchema => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * Create Site Navigation schema
 */
export const createNavigationSchema = (
  navigationItems: Array<{ name: string; url: string }>,
): SiteNavigationElementSchema => ({
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  name: "Main Navigation",
  url: BASE_URL,
  hasPart: navigationItems.map((item) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
  })),
});

/**
 * Create Item List schema (for product collections)
 */
export const createItemListSchema = (
  products: Array<{
    name: string;
    description: string;
    url: string;
    image?: string;
    price?: string;
    currency?: string;
  }>,
  listName?: string,
  listDescription?: string,
): ItemListSchema => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: listName,
  description: listDescription,
  numberOfItems: products.length,
  itemListElement: products.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: createProductSchema(product),
  })),
});

/**
 * Create homepage product showcase schema
 */
export const createHomepageProductSchema = (
  locale = "en",
  translations: {
    stickers: string;
    stickersDescription: string;
    supermotoParts: string;
    superMotoPartsDescription: string;
  },
): ItemListSchema => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: createProductSchema({
        name: translations.stickers,
        description: translations.stickersDescription,
        url: `${BASE_URL}/${locale}/stickers`,
        image: `${BASE_URL}/stickersheet.png`,
        currency: "CHF",
        availability: "https://schema.org/InStock",
      }),
    },
    {
      "@type": "ListItem",
      position: 2,
      item: createProductSchema({
        name: translations.supermotoParts,
        description: translations.superMotoPartsDescription,
        url: `${BASE_URL}/${locale}/parts`,
        image: `${BASE_URL}/supermotosheet.webp`,
        currency: "CHF",
        availability: "https://schema.org/InStock",
      }),
    },
  ],
});

/**
 * Create VideoObject schema for product videos
 */
export const createVideoObjectSchema = (video: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 duration format (e.g., "PT1M30S" for 1 min 30 sec)
}): VideoObjectSchema => ({
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: video.name,
  description: video.description,
  thumbnailUrl: video.thumbnailUrl,
  uploadDate: video.uploadDate,
  contentUrl: video.contentUrl,
  embedUrl: video.embedUrl,
  duration: video.duration,
});
