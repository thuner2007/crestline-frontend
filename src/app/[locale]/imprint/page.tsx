import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import ImprintPage from "./PageClient";

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
    title: t("riders.title"),
    description: t("imprint.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("riders.title"),
      description: t("imprint.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/imprint`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("riders.title"),
      description: t("imprint.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/imprint`,
      languages: {
        "x-default": "https://revsticks.ch/en/imprint",
        en: "https://revsticks.ch/en/imprint",
        de: "https://revsticks.ch/de/imprint",
        fr: "https://revsticks.ch/fr/imprint",
        it: "https://revsticks.ch/it/imprint",
      },
    },
  };
}

export default function LandingPage() {
  return <ImprintPage />;
}
