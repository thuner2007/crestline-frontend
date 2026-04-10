import { CartProvider } from "@/components/CartContext";
import ClientLayout from "@/components/ClientLayout";
import DynamicWebSocketTracker from "@/components/DynamicWebSocketTracker";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";

const locales = ["en", "de", "fr", "it"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    manifest: `/${locale}/manifest.webmanifest`,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await `params` before destructuring
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <ClientLayout messages={messages} locale={locale}>
      <CartProvider>
        <DynamicWebSocketTracker />
        {children}
      </CartProvider>
    </ClientLayout>
  );
}

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
