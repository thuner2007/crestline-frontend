export const locales = ["en", "de", "fr", "it"] as const;

// Get locale segment from path
export function getLocaleSegment(pathname: string): string | undefined {
  const segments = pathname.split("/");
  const localeSegment = segments[1];
  return locales.includes(localeSegment as (typeof locales)[number])
    ? localeSegment
    : undefined;
}
