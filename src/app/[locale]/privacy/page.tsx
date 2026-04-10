import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import PrivacyPage from "./PageClient";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema } from "@/lib/schema";

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
    title: t("privacy.title"),
    description: t("privacy.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("privacy.title"),
      description: t("privacy.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/privacy`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("privacy.title"),
      description: t("privacy.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/privacy`,
      languages: {
        "x-default": "https://revsticks.ch/en/privacy",
        en: "https://revsticks.ch/en/privacy",
        de: "https://revsticks.ch/de/privacy",
        fr: "https://revsticks.ch/fr/privacy",
        it: "https://revsticks.ch/it/privacy",
      },
    },
  };
}

export default async function LandingPage() {
  const t = await getTranslations("common");
  const locale = await getLocale();

  // Create breadcrumb schema
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: t("home"), url: `https://revsticks.ch/${locale}` },
    { name: t("privacy") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <PrivacyPage />
    </>
  );
}
