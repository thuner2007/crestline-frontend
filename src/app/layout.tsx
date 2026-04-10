import { EnvProvider } from "@/context/EnvContext";
import "./globals.css"; // Ensure global styles are applied
import Providers from "@/components/Providers";
import { JsonLd } from "@/components/JsonLd";
import { createOrganizationSchema, createWebsiteSchema } from "@/lib/schema";
import { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://revsticks.ch"
  ),
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}) {
  // Generate base schemas that should be on every page
  const organizationSchema = createOrganizationSchema();
  const websiteSchema = createWebsiteSchema();

  // Get locale from params, default to 'en' if not available
  const { locale } = await params;
  const lang = locale || "en";

  return (
    <html lang={lang}>
      <head>
        {/* Base JSON-LD schemas */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />

        {/* Resource hints for performance */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://minio-api.cwx-dev.com" />
        <link rel="dns-prefetch" href="//api.ipify.org" />
        <link rel="dns-prefetch" href="//nominatim.openstreetmap.org" />

        {/* Preload critical assets */}
        <link rel="preload" href="/512x512.png" as="image" type="image/png" />
        <link rel="preload" href="/192x192.png" as="image" type="image/png" />

        {/* Favicon and manifest */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Theme */}
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <EnvProvider
          BACKEND_URL={process.env.BACKEND_URL ?? ""}
          STRIPE_PUBLISHABLE_KEY={
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
          }
          PAYPAL_CLIENT_ID={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
        >
          <Providers>{children}</Providers>
        </EnvProvider>
      </body>
    </html>
  );
}
