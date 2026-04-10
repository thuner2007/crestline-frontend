import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import ContactPage from "./PageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

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
    title: t("contact.title"),
    description: t("contact.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("contact.title"),
      description: t("contact.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/contact`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("contact.title"),
      description: t("contact.description"),
    },
    alternates: {
      languages: {
        en: `https://revsticks.ch/en/contact`,
        de: `https://revsticks.ch/de/contact`,
        fr: `https://revsticks.ch/fr/contact`,
        it: `https://revsticks.ch/it/contact`,
      },
    },
  };
}

export default function Page() {
  return <ContactPage />;
}
