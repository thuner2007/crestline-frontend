import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/schema";

// Dynamic import for client component to improve TTI
const CheckoutPage = dynamic(() => import("./PageClient"), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    title: t("checkout.title"),
    description: t("checkout.description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
    },
    alternates: {
      languages: {
        en: "https://revsticks.ch/en/checkout",
        de: "https://revsticks.ch/de/checkout",
        fr: "https://revsticks.ch/fr/checkout",
        it: "https://revsticks.ch/it/checkout",
      },
      canonical: `https://revsticks.ch/${locale}/checkout`,
    },
    // Explicitly remove social media meta tags for privacy
    openGraph: undefined,
    twitter: undefined,
  };
}

export default async function LandingPage() {
  const t = await getTranslations("checkout");
  const locale = await getLocale();

  // Create structured data for checkout page
  const breadcrumbSchema = createBreadcrumbSchema([
    {
      name: "Home",
      url: "https://revsticks.ch",
    },
    {
      name: "Cart",
      url: `https://revsticks.ch/${locale}/cart`,
    },
    {
      name: t("checkoutTitle") || "Checkout",
    },
  ]);

  const webPageSchema = createWebPageSchema(
    t("checkoutTitle") || "Checkout",
    t("checkoutDescription") || "Complete your purchase and payment",
    `https://revsticks.ch/${locale}/checkout`,
    locale
  );

  return (
    <>
      {/* Checkout page structured data */}
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />

      <CheckoutPage />
    </>
  );
}
