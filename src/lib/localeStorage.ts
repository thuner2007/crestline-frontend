'use client';

// this is only used for language selection
export const LOCALE_STORAGE_KEY = 'preferred_locale';
export const DEFAULT_LOCALE = 'en'; // English is the default

export const localeStorage = {
  get: (): string => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;

    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      return stored || DEFAULT_LOCALE;
    } catch (error) {
      console.warn('Failed to read locale from localStorage:', error);
      return DEFAULT_LOCALE;
    }
  },

  set: (locale: string): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch (error) {
      console.warn('Failed to save locale to localStorage:', error);
    }
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(LOCALE_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove locale from localStorage:', error);
    }
  },
};
