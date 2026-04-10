import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema } from "@/lib/schema";

// Dynamic import for client component to improve TTI
const LoginPage = dynamic(() => import("./PageClient"), {
  ssr: true,
});

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
    title: t("login.title"),
    description: t("login.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("login.title"),
      description: t("login.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/login`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("login.title"),
      description: t("login.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/login`,
      languages: {
        "x-default": "https://revsticks.ch/en/login",
        en: "https://revsticks.ch/en/login",
        de: "https://revsticks.ch/de/login",
        fr: "https://revsticks.ch/fr/login",
        it: "https://revsticks.ch/it/login",
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
    { name: t("login") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <LoginPage />
    </>
  );
}
