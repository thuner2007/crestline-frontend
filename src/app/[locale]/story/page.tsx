import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import StoryPage from "./PageClient";

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
    title: t("story.title"),
    description: t("story.description"),
    keywords: t("story.keywords"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("story.title"),
      description: t("story.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "article",
      url: `https://revsticks.ch/${locale}/story`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary_large_image",
      title: t("story.title"),
      description: t("story.description"),
      images: ["/512x512.png"],
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/story`,
      languages: {
        "x-default": "https://revsticks.ch/en/story",
        en: "https://revsticks.ch/en/story",
        de: "https://revsticks.ch/de/story",
        fr: "https://revsticks.ch/fr/story",
        it: "https://revsticks.ch/it/story",
      },
    },
  };
}

export default function StoryPageContainer() {
  return <StoryPage />;
}
