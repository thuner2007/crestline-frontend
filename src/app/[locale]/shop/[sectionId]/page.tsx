import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import dynamic from "next/dynamic";

const PageClient = dynamic(() => import("./PageClient"), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    title: t("parts.title"),
    description: t("parts.description"),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/shop`,
      languages: {
        "x-default": "https://revsticks.ch/en/shop",
        en: "https://revsticks.ch/en/shop",
        de: "https://revsticks.ch/de/shop",
        fr: "https://revsticks.ch/fr/shop",
        it: "https://revsticks.ch/it/shop",
      },
    },
  };
}

export default function SectionPage() {
  return <PageClient />;
}
