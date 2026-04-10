import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import WithdrawalPage from "./Pageclient";

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
    title: t("withdrawal.title"),
    description: t("withdrawal.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("withdrawal.title"),
      description: t("withdrawal.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/withdrawal`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("withdrawal.title"),
      description: t("withdrawal.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/withdrawal`,
      languages: {
        "x-default": "https://revsticks.ch/en/withdrawal",
        en: "https://revsticks.ch/en/withdrawal",
        de: "https://revsticks.ch/de/withdrawal",
        fr: "https://revsticks.ch/fr/withdrawal",
        it: "https://revsticks.ch/it/withdrawal",
      },
    },
  };
}

export default function LandingPage() {
  return <WithdrawalPage />;
}
