import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/schema";

// Dynamic import for client component to improve TTI
const CartPage = dynamic(() => import("./PageClient"), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    title: t("cart.title"),
    description: t("cart.description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
    },
    alternates: {
      languages: {
        en: "https://revsticks.ch/en/cart",
        de: "https://revsticks.ch/de/cart",
        fr: "https://revsticks.ch/fr/cart",
        it: "https://revsticks.ch/it/cart",
      },
      canonical: `https://revsticks.ch/${locale}/cart`,
    },
    // Explicitly remove social media meta tags for privacy
    openGraph: undefined,
    twitter: undefined,
  };
}

export default async function LandingPage() {
  const t = await getTranslations("cart");
  const tMeta = await getTranslations("metadata");
  const locale = await getLocale();

  // Create structured data for cart page
  const breadcrumbSchema = createBreadcrumbSchema([
    {
      name: "Home",
      url: "https://revsticks.ch",
    },
    {
      name: t("title") || "Shopping Cart",
    },
  ]);

  const webPageSchema = createWebPageSchema(
    t("title") || "Shopping Cart",
    tMeta("cart.description") || "Your shopping cart with selected items",
    `https://revsticks.ch/${locale}/cart`,
    locale
  );

  return (
    <>
      {/* Cart page structured data */}
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />

      <CartPage />
    </>
  );
}
