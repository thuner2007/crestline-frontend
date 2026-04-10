'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { setLocaleCookie } from '@/app/actions/locale';

export default function LocalePreferenceProvider() {
  const currentLocale = useLocale();

  useEffect(() => {
    // Ensure cookie is set on every page load to keep it fresh
    setLocaleCookie(currentLocale);
  }, [currentLocale]);

  return null; // This component doesn't render anything
}
