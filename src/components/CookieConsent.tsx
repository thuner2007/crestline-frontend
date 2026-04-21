'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import storage from '@/lib/storage';

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);
  const t = useTranslations('cookieConsent');
  const locale = useLocale();

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = storage.getItem('cookieConsent');
    const hasOptionalConsented = storage.getItem('optionalCookieConsent');
    if (hasConsented === null && hasOptionalConsented === null) {
      setShowConsent(true);
    }
  }, []);

  const handleAcceptAll = () => {
    storage.setItem('cookieConsent', 'true');
    storage.setItem('optionalCookieConsent', 'true');
    setShowConsent(false);
  };

  const handleAcceptOptional = () => {
    storage.setItem('cookieConsent', 'false');
    storage.setItem('optionalCookieConsent', 'true');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h2
              className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >-
              {t('title')}
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {t('message')}
            </p>
            <Link
              href={`/${locale}/privacy`}
              className="mt-1 inline-block text-xs text-amber-400 underline hover:text-amber-300"
            >
              {t('learnMore')}
            </Link>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              onClick={handleAcceptOptional}
              className="border border-zinc-700 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('acceptOptional')}
            </button>
            <button
              onClick={handleAcceptAll}
              className="bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-amber-400"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('acceptAll')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
