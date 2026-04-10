import { AnimatePresence, motion } from "framer-motion";
import { X, Menu } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const locale = useLocale();
  const { user } = useAuth();

  const [navItems, setNavItems] = useState<
    Array<{ name: string; path: string }>
  >([]);

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

  const isActive = (path: string) =>
    pathname.includes(path) && path !== "/";

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={`/${locale}/`}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="h-6 w-1 bg-amber-500" />
            <span
              className="text-base font-bold uppercase tracking-[0.18em] text-white sm:text-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Crestline{" "}
              <span className="text-amber-400">Customs</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={`/${locale}${item.path}`}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200 ${
                  isActive(item.path)
                    ? "text-amber-400"
                    : "text-zinc-400 hover:text-white"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.name}
                {isActive(item.path) && (
                  <span className="inline-block h-px w-3 bg-amber-400" />
                )}
              </Link>
            ))}
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
              {navItems.map((item, index) => (
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
                    style={{ fontFamily: "var(--font-display)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
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
