import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import AnaniaPageClient from "./PageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("anania");
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
    title: t("title"),
    description: t("description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/anania_logo.jpeg",
          width: 1200,
          height: 630,
          alt: "Revsticks x Anania.ch",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/collabs/anania`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/collabs/anania`,
      languages: {
        "x-default": "https://revsticks.ch/en/collabs/anania",
        en: "https://revsticks.ch/en/collabs/anania",
        de: "https://revsticks.ch/de/collabs/anania",
        fr: "https://revsticks.ch/fr/collabs/anania",
        it: "https://revsticks.ch/it/collabs/anania",
      },
    },
  };
}

export default function AnaniaPage() {
  return <AnaniaPageClient />;
}
