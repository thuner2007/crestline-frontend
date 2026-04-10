// Base schema interface
export interface BaseSchema {
  "@context": "https://schema.org";
  "@type": string;
}

// Organization schema
export interface OrganizationSchema extends BaseSchema {
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  address?: {
    "@type": "PostalAddress";
    addressCountry?: string;
    addressLocality?: string;
    postalCode?: string;
    streetAddress?: string;
  };
  contactPoint?: {
    "@type": "ContactPoint";
    telephone?: string;
    contactType: string;
    email?: string;
  };
  potentialAction?: {
    "@type": "SearchAction";
    target:
      | string
      | {
          "@type": "EntryPoint";
          urlTemplate: string;
        };
    "query-input": string;
  };
}

// Website schema
export interface WebSiteSchema extends BaseSchema {
  "@type": "WebSite";
  name: string;
  alternateName?: string;
  url: string;
  description?: string;
  potentialAction?: {
    "@type": "SearchAction";
    target:
      | string
      | {
          "@type": "EntryPoint";
          urlTemplate: string;
        };
    "query-input": string;
  };
}

// WebPage schema
export interface WebPageSchema extends BaseSchema {
  "@type": "WebPage";
  name: string;
  description?: string;
  url: string;
  mainEntity?: string;
  breadcrumb?: BreadcrumbListSchema;
  isPartOf?: {
    "@type": "WebSite";
    name: string;
    url: string;
  };
  inLanguage?: string;
  datePublished?: string;
  dateModified?: string;
}

// CollectionPage schema (for product listings)
export interface CollectionPageSchema extends BaseSchema {
  "@type": "CollectionPage";
  name: string;
  description?: string;
  url: string;
  mainEntity?: ItemListSchema;
  breadcrumb?: BreadcrumbListSchema;
  isPartOf?: {
    "@type": "WebSite";
    name: string;
    url: string;
  };
  inLanguage?: string;
}

// Local Business schema
export interface LocalBusinessSchema extends BaseSchema {
  "@type": "LocalBusiness";
  name: string;
  description?: string;
  url: string;
  logo?: string;
  image?: string | string[];
  address?: {
    "@type": "PostalAddress";
    addressCountry?: string;
    addressLocality?: string;
    postalCode?: string;
    streetAddress?: string;
  };
  sameAs?: string[];
  telephone?: string;
  email?: string;
  openingHours?: string[];
  priceRange?: string;
}

// Product schema
export interface ProductSchema extends BaseSchema {
  "@type": "Product";
  name: string;
  description: string;
  image?: string | string[];
  url?: string;
  sku?: string;
  brand?: {
    "@type": "Brand";
    name: string;
  };
  offers?: OfferSchema | OfferSchema[];
  itemCondition?: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  review?: ReviewSchema[];
}

// Offer schema
export interface OfferSchema {
  "@type": "Offer";
  price?: string;
  priceCurrency?: string;
  availability: string;
  url?: string;
  seller?: {
    "@type": "Organization";
    name: string;
  };
  validFrom?: string;
  validThrough?: string;
  priceValidUntil?: string; // Date until which the price is valid (YYYY-MM-DD format)
}

// Review schema
export interface ReviewSchema {
  "@type": "Review";
  author: {
    "@type": "Person";
    name: string;
  };
  datePublished: string;
  description: string;
  name: string;
  reviewRating: {
    "@type": "Rating";
    bestRating: number;
    ratingValue: number;
    worstRating: number;
  };
}

// Breadcrumb schema
export interface BreadcrumbListSchema extends BaseSchema {
  "@type": "BreadcrumbList";
  itemListElement: BreadcrumbItemSchema[];
}

export interface BreadcrumbItemSchema {
  "@type": "ListItem";
  position: number;
  name: string;
  item?: string;
}

// Navigation schema
export interface SiteNavigationElementSchema extends BaseSchema {
  "@type": "SiteNavigationElement";
  name: string;
  url: string;
  hasPart?: SiteNavigationElementSchema[];
}

// Item List schema (for product collections)
export interface ItemListSchema extends BaseSchema {
  "@type": "ItemList";
  itemListElement: ItemListElementSchema[];
  numberOfItems?: number;
  name?: string;
  description?: string;
}

export interface ItemListElementSchema {
  "@type": "ListItem";
  position: number;
  item: ProductSchema | string;
}

// FAQ schema
export interface FAQPageSchema extends BaseSchema {
  "@type": "FAQPage";
  mainEntity: QuestionSchema[];
}

export interface QuestionSchema {
  "@type": "Question";
  name: string;
  acceptedAnswer: {
    "@type": "Answer";
    text: string;
  };
}

// Article schema
export interface ArticleSchema extends BaseSchema {
  "@type": "Article";
  headline: string;
  description: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  datePublished: string;
  dateModified?: string;
  image?: string | string[];
  url?: string;
}

// VideoObject schema
export interface VideoObjectSchema extends BaseSchema {
  "@type": "VideoObject";
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  embedUrl?: string;
  duration?: string;
}

// Union type for all schemas
export type SchemaType =
  | OrganizationSchema
  | WebSiteSchema
  | WebPageSchema
  | CollectionPageSchema
  | LocalBusinessSchema
  | ProductSchema
  | BreadcrumbListSchema
  | SiteNavigationElementSchema
  | ItemListSchema
  | FAQPageSchema
  | VideoObjectSchema
  | ArticleSchema;
