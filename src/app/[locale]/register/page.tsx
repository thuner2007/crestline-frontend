import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema } from "@/lib/schema";

// Dynamic import for client component to improve TTI
const RegisterPage = dynamic(() => import("./PageClient"), {
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
    title: t("register.title"),
    description: t("register.description"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: t("register.title"),
      description: t("register.description"),
      images: [
        {
          url: "/512x512.png",
          width: 1200,
          height: 630,
          alt: "Revsticks Logo",
        },
      ],
      type: "website",
      url: `https://revsticks.ch/${locale}/register`,
      siteName: "RevSticks",
      locale: ogLocaleMap[locale] || "de_CH",
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: "summary",
      title: t("register.title"),
      description: t("register.description"),
    },
    alternates: {
      canonical: `https://revsticks.ch/${locale}/register`,
      languages: {
        "x-default": "https://revsticks.ch/en/register",
        en: "https://revsticks.ch/en/register",
        de: "https://revsticks.ch/de/register",
        fr: "https://revsticks.ch/fr/register",
        it: "https://revsticks.ch/it/register",
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
    { name: t("register") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <RegisterPage />
    </>
  );
}
