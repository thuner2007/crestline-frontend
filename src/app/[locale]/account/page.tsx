import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/schema";

// Dynamic import for client component to improve TTI
const AccountClientPage = dynamic(() => import("./PageClient"), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    title: t("account.title"),
    description: t("account.description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
    },
    alternates: {
      languages: {
        en: "https://revsticks.ch/en/account",
        de: "https://revsticks.ch/de/account",
        fr: "https://revsticks.ch/fr/account",
        it: "https://revsticks.ch/it/account",
      },
      canonical: `https://revsticks.ch/${locale}/account`,
    },
    // Explicitly remove social media meta tags for privacy
    openGraph: undefined,
    twitter: undefined,
  };
}

export default async function AccountPage() {
  const t = await getTranslations("account");
  const locale = await getLocale();

  // Create structured data for account page
  const breadcrumbSchema = createBreadcrumbSchema([
    {
      name: "Home",
      url: "https://revsticks.ch",
    },
    {
      name: t("accountTitle") || "Account",
    },
  ]);

  const webPageSchema = createWebPageSchema(
    t("accountTitle") || "User Account",
    t("accountDescription") || "User account management page",
    `https://revsticks.ch/${locale}/account`,
    locale
  );

  return (
    <>
      {/* Account page structured data */}
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />

      <AccountClientPage />
    </>
  );
}
