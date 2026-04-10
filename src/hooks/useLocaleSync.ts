'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { localeStorage } from '@/lib/localeStorage';
import Cookies from 'js-cookie';

export function useLocaleSync() {
  const currentLocale = useLocale();

  useEffect(() => {
    // Sync the current locale to localStorage and cookie
    // This ensures that if the user navigates to a different locale via URL,
    // it gets saved as their preference
    localeStorage.set(currentLocale);

    // Also update the cookie
    Cookies.set('NEXT_LOCALE', currentLocale, {
      expires: 365,
      path: '/',
      sameSite: 'lax',
    });
  }, [currentLocale]);

  return currentLocale;
}
