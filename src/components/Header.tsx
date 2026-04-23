"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Menu, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";
import useAxios from "@/useAxios";

interface SectionTranslation {
  language: string;
  title: string;
}

interface PartSection {
  id: string;
  sortingRank: number;
  translations: SectionTranslation[];
}

const Header = () => {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [sections, setSections] = useState<PartSection[]>([]);

  const shopRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locale = useLocale();
  const { user } = useAuth();
  const axiosInstance = useAxios();

  const [navItems, setNavItems] = useState<Array<{ name: string; path: string }>>([]);

  useEffect(() => {
    const baseNavItems = [
      { name: t("parts"), path: "/shop" },
      { name: t("cart"), path: "/cart" },
    ];
    if (user?.username) {
      baseNavItems.push({ name: t("account"), path: "/account" });
      if (user.role === "admin") {
        baseNavItems.push({ name: "Admin", path: "/admin" });
      }
    } else {
      baseNavItems.push({ name: t("login"), path: "/login" });
    }
    setNavItems(baseNavItems);
  }, [t, user]);

  const fetchSections = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<PartSection[]>("/part-sections");
      setSections(data);
    } catch {
      // sections are decorative in nav, ignore errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSectionTitle = (section: PartSection): string =>
    section.translations.find((tr) => tr.language === locale)?.title ||
    section.translations.find((tr) => tr.language === "en")?.title ||
    section.translations[0]?.title ||
    "";

  const isActive = (path: string) => pathname.includes(path) && path !== "/";

  const handleShopMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (sections.length > 0) setShopDropdownOpen(true);
  };

  const handleShopMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setShopDropdownOpen(false), 120);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href={`/${locale}/`} className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="h-6 w-1 bg-amber-500" />
            <span
              className="text-base font-bold uppercase tracking-[0.18em] text-white sm:text-lg"
              style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
            >
              Crestline <span className="text-amber-400">Customs</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const isShop = item.path === "/shop";

              if (isShop && sections.length > 0) {
                return (
                  <div
                    key={item.name}
                    ref={shopRef}
                    className="relative"
                    onMouseEnter={handleShopMouseEnter}
                    onMouseLeave={handleShopMouseLeave}
                  >
                    {/* Shop link + chevron trigger */}
                    <Link
                      href={`/${locale}/shop`}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${
                        isActive(item.path) ? "text-amber-400" : "text-zinc-400 hover:text-white"
                      }`}
                      style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                    >
                      {item.name}
                      {isActive(item.path) && <span className="inline-block h-px w-3 bg-amber-400" />}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${shopDropdownOpen ? "rotate-180 text-amber-400" : ""}`}
                      />
                    </Link>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {shopDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-0 top-full z-50 min-w-[200px] border border-zinc-800 bg-zinc-950 shadow-xl"
                          onMouseEnter={handleShopMouseEnter}
                          onMouseLeave={handleShopMouseLeave}
                        >
                          {/* All link */}
                          <Link
                            href={`/${locale}/shop`}
                            className="flex items-center border-b border-zinc-800 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white"
                            style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                          >
                            {t("parts")}
                          </Link>
                          {sections.map((section) => (
                            <Link
                              key={section.id}
                              href={`/${locale}/shop/${section.id}`}
                              className={`flex items-center px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-zinc-900 hover:text-white ${
                                pathname.includes(section.id) ? "text-amber-400" : "text-zinc-400"
                              }`}
                              style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                            >
                              {getSectionTitle(section)}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={`/${locale}${item.path}`}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${
                    isActive(item.path) ? "text-amber-400" : "text-zinc-400 hover:text-white"
                  }`}
                  style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                >
                  {item.name}
                  {isActive(item.path) && <span className="inline-block h-px w-3 bg-amber-400" />}
                </Link>
              );
            })}
            <div className="ml-3 border-l border-zinc-800 pl-3">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 text-zinc-400 transition-colors hover:text-white md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence mode="wait">
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="border-t border-zinc-800 bg-zinc-950 md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navItems.map((item, index) => {
                const isShop = item.path === "/shop";

                if (isShop && sections.length > 0) {
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      {/* Shop parent */}
                      <button
                        onClick={() => setMobileShopOpen((v) => !v)}
                        className={`flex w-full items-center justify-between border-l-2 px-3 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                          isActive(item.path)
                            ? "border-amber-500 text-amber-400"
                            : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white"
                        }`}
                        style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                      >
                        {item.name}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${mobileShopOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Section sub-items */}
                      <AnimatePresence>
                        {mobileShopOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <Link
                              href={`/${locale}/shop`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center border-l-2 border-transparent py-2.5 pl-8 pr-3 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-all hover:border-zinc-600 hover:text-white"
                              style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                            >
                              {t("parts")}
                            </Link>
                            {sections.map((section) => (
                              <Link
                                key={section.id}
                                href={`/${locale}/shop/${section.id}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center border-l-2 py-2.5 pl-8 pr-3 text-xs font-bold uppercase tracking-widest transition-all ${
                                  pathname.includes(section.id)
                                    ? "border-amber-500 text-amber-400"
                                    : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white"
                                }`}
                                style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                              >
                                {getSectionTitle(section)}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Link
                      href={`/${locale}${item.path}`}
                      className={`flex items-center border-l-2 px-3 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                        isActive(item.path)
                          ? "border-amber-500 text-amber-400"
                          : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white"
                      }`}
                      style={{ fontFamily: "var(--font-display, var(--font-sans))" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="border-t border-zinc-800 pt-3">
                <LanguageSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Header;
