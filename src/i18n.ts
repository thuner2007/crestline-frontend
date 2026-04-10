import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export const locales = ["en", "de", "fr", "it"];
export const defaultLocale = "en";

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale using the new API
  const locale = (await requestLocale) ?? defaultLocale;

  // Validate that the incoming locale is valid
  if (!locales.includes(locale ?? "")) notFound();

  // Enable static rendering
  setRequestLocale(locale ?? defaultLocale);

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    locale: locale, // Ensured to be a string
    timeZone: "Europe/Zurich",
  };
});
