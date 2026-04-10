"use client";

import { DM_Sans, Oswald } from "next/font/google";
import { AnimatePresence } from "framer-motion";
import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import React from "react";
import CookieConsent from "./CookieConsent";
import Header from "./Header";
import Footer from "./Footer";
import LocalePreferenceProvider from "./LocalePreferenceProvider";
import { useLocaleSync } from "@/hooks/useLocaleSync";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

interface ClientLayoutProps {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
}

function LocaleSyncWrapper() {
  useLocaleSync();
  return null;
}

export default function ClientLayout({
  children,
  messages,
  locale,
}: ClientLayoutProps) {
  const timeZone = "Europe/Vienna";

  return (
    <NextIntlClientProvider
      timeZone={timeZone}
      locale={locale}
      messages={messages}
    >
      <LocaleSyncWrapper />
      <LocalePreferenceProvider />
      <div className={`flex flex-col min-h-screen ${dmSans.variable} ${oswald.variable}`} style={{ fontFamily: "var(--font-body)" }}>
        {/* Navigation */}
        <Header />
        {/* Main Content */}
        <AnimatePresence mode="wait">
          <main key="main-content" className="w-full flex justify-center">
            {children}
          </main>
        </AnimatePresence>
        <CookieConsent />

        {/* Footer */}
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
