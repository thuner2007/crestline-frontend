## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Env

Copy the [Env Example](./env.example) and make a .env file in root

# JSON-LD Schema.org Implementation

This document explains how to use the JSON-LD structured data system in your Next.js application.

## Files Overview

- `src/components/JsonLd.tsx` - Reusable component for injecting JSON-LD scripts
- `src/types/schema.ts` - TypeScript definitions for all schema types
- `src/lib/schema.ts` - Utility functions for generating common schemas

## Basic Usage

### 1. Global Schemas (Root Layout)

The root layout (`src/app/layout.tsx`) includes base schemas that appear on every page:

- Organization schema
- Website schema

### 2. Page-Specific Schemas

For individual pages, import and use the utility functions:

```tsx
import { JsonLd } from "@/components/JsonLd";
import { createProductSchema, createBreadcrumbSchema } from "@/lib/schema";

export default function ProductPage({ params }: { params: { id: string } }) {
  const productSchema = createProductSchema({
    name: "Product Name",
    description: "Product description",
    price: "29.99",
    currency: "CHF",
    image: "https://example.com/product.jpg",
    url: "https://example.com/product",
  });

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://example.com" },
    { name: "Products", url: "https://example.com/products" },
    { name: "Product Name" },
  ]);

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <div>{/* Your page content */}</div>
    </>
  );
}
```

## Available Schema Types

### Organization Schema

```tsx
import { createOrganizationSchema } from "@/lib/schema";

const organizationSchema = createOrganizationSchema();
```

### Website Schema

```tsx
import { createWebsiteSchema } from "@/lib/schema";

const websiteSchema = createWebsiteSchema();
```

### WebPage Schema

```tsx
import { createWebPageSchema } from "@/lib/schema";

const webPageSchema = createWebPageSchema(
  "Page Title",
  "Page description",
  "https://example.com/page",
  "en" // locale
);
```

### Local Business Schema

```tsx
import { createLocalBusinessSchema } from "@/lib/schema";

const localBusinessSchema = createLocalBusinessSchema(
  "Your business description"
);
```

### Product Schema

```tsx
import { createProductSchema } from "@/lib/schema";

const productSchema = createProductSchema({
  name: "Product Name",
  description: "Product description",
  price: "29.99",
  currency: "CHF",
  image: "https://example.com/image.jpg",
  url: "https://example.com/product",
  availability: "https://schema.org/InStock", // optional
});
```

### Breadcrumb Schema

```tsx
import { createBreadcrumbSchema } from "@/lib/schema";

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", url: "https://example.com" },
  { name: "Category", url: "https://example.com/category" },
  { name: "Current Page" }, // No URL for current page
]);
```

### Navigation Schema

```tsx
import { createNavigationSchema } from "@/lib/schema";

const navigationSchema = createNavigationSchema([
  { name: "Home", url: "https://example.com" },
  { name: "Products", url: "https://example.com/products" },
  { name: "About", url: "https://example.com/about" },
]);
```

### Item List Schema (Product Collections)

```tsx
import { createItemListSchema } from "@/lib/schema";

const itemListSchema = createItemListSchema(
  [
    {
      name: "Product 1",
      description: "Description 1",
      url: "https://example.com/product1",
      price: "19.99",
      currency: "CHF",
    },
    {
      name: "Product 2",
      description: "Description 2",
      url: "https://example.com/product2",
      price: "29.99",
      currency: "CHF",
    },
  ],
  "Product Collection", // Optional list name
  "A collection of our best products" // Optional list description
);
```

## Custom Schemas

For schemas not covered by the utility functions, you can create them manually:

```tsx
import { JsonLd } from "@/components/JsonLd";
import type { FAQPageSchema } from "@/types/schema";

const faqSchema: FAQPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is your return policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a 30-day return policy for all items.",
      },
    },
  ],
};

// Use in your component
<JsonLd data={faqSchema} />;
```

## Testing Your Structured Data

Use these tools to validate your JSON-LD:

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **JSON-LD Playground**: https://json-ld.org/playground/

## Best Practices

1. **Include relevant schemas on every page** - Use breadcrumbs, navigation, and page-specific schemas
2. **Keep schemas up-to-date** - Ensure URLs, prices, and descriptions match your actual content
3. **Test regularly** - Use the validation tools to ensure your structured data is correct
4. **Be specific** - Use the most specific schema type available (e.g., `LocalBusiness` instead of just `Organization`)
5. **Include images** - Add high-quality images to product and organization schemas

## Common Schema Types for E-commerce

- **Organization/LocalBusiness** - For your company information
- **WebSite** - For your main website
- **WebPage** - For individual pages (account, about, etc.)
- **Product** - For individual products
- **Offer** - For pricing and availability
- **Review/AggregateRating** - For customer reviews
- **BreadcrumbList** - For navigation breadcrumbs
- **ItemList** - For product collections/categories
- **Article** - For blog posts
- **FAQPage** - For FAQ sections

## Example: Account/Profile Page

```tsx
// src/app/[locale]/account/page.tsx
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/schema";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const locale = await getLocale();

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://revsticks.ch" },
    { name: "Account" },
  ]);

  const webPageSchema = createWebPageSchema(
    "User Account",
    "User account management page",
    `https://revsticks.ch/${locale}/account`,
    locale
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />
      <div>{/* Your page content */}</div>
    </>
  );
}
```

# crestline-frontend
