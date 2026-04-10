import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { JsonLd } from "@/components/JsonLd";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/schema";
import AdminLayoutClient from "./AdminLayoutClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();

  return {
    title: t("admin.title"),
    description: t("admin.description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
    },
    alternates: {
      languages: {
        en: "https://revsticks.ch/en/admin",
        de: "https://revsticks.ch/de/admin",
        fr: "https://revsticks.ch/fr/admin",
        it: "https://revsticks.ch/it/admin",
      },
      canonical: `https://revsticks.ch/${locale}/admin`,
    },
    openGraph: undefined,
    twitter: undefined,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://revsticks.ch" },
    { name: t("adminTitle") || "Admin" },
  ]);

  const webPageSchema = createWebPageSchema(
    t("adminTitle") || "Admin Panel",
    t("adminDescription") || "Administrative interface for RevSticks",
    `https://revsticks.ch/${locale}/admin`,
    locale
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  );
}
