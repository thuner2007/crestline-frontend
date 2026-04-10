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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>

          <div className="text-gray-700 mb-6 space-y-4">
            <p className="text-base leading-relaxed">{t('message')}</p>

            <p className="text-sm">
              <Link
                href={`/${locale}/privacy`}
                className="text-purple-700 hover:text-purple-800 underline"
              >
                {t('learnMore')}
              </Link>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={handleAcceptOptional}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              {t('acceptOptional')}
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-6 py-3 bg-purple-700 text-white rounded-md hover:bg-purple-800 transition-colors font-medium"
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
