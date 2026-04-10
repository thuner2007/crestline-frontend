"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocaleCookie } from "@/app/actions/locale";

const LanguageSwitcher = () => {
  const pathname = usePathname();
  const locale = useLocale();

  // Get the path without the locale prefix
  const getPathWithoutLocale = () => {
    const segments = pathname.split("/");
    // Remove first segment (locale) and join the rest
    return segments.length > 2 ? `/${segments.slice(2).join("/")}` : "/";
  };

  const handleLanguageSwitch = async (
    e: React.MouseEvent,
    newLocale: string
  ) => {
    e.preventDefault();
    const localeCode = newLocale.substring(1); // Remove the leading slash

    // Set cookie on server using server action
    await setLocaleCookie(localeCode);

    // Redirect to new locale while preserving the current path
    const pathWithoutLocale = getPathWithoutLocale();
    window.location.href = `/${localeCode}${pathWithoutLocale}`;
  };

  const locales = ["en", "de", "fr", "it"] as const;

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && (
            <span className="mx-1 h-3 w-px bg-zinc-700" aria-hidden="true" />
          )}
          <Link
            href={`/${loc}${getPathWithoutLocale()}`}
            onClick={(e) => handleLanguageSwitch(e, `/${loc}`)}
            className={`px-1 py-0.5 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${
              locale === loc
                ? "text-amber-400"
                : "text-zinc-400 hover:text-white"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loc}
          </Link>
        </span>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
