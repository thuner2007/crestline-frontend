import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import AGBPage from "./PageClient";

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
    title: t("agb.title"),
    description: t("agb.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("agb.title"),
      description: t("agb.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/agb`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("agb.title"),
      description: t("agb.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/agb`,
      languages: {
        "x-default": "https://revsticks.ch/en/agb",
        en: "https://revsticks.ch/en/agb",
        de: "https://revsticks.ch/de/agb",
        fr: "https://revsticks.ch/fr/agb",
        it: "https://revsticks.ch/it/agb",
      },
    },
  };
}

export default function LandingPage() {
  return <AGBPage />;
}
