import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import MaintenancePageClient from './PageClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  const locale = await getLocale();

  return {
    title: t('maintenance.title'),
    description: t('maintenance.description'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
    },
    alternates: {
      languages: {
        en: 'https://revsticks.ch/en/maintenance',
        de: 'https://revsticks.ch/de/maintenance',
        fr: 'https://revsticks.ch/fr/maintenance',
        it: 'https://revsticks.ch/it/maintenance',
      },
      canonical: `https://revsticks.ch/${locale}/maintenance`,
    },
    // Explicitly remove social media meta tags for privacy
    openGraph: undefined,
    twitter: undefined,
  };
}

export default function MaintenancePage() {
  return <MaintenancePageClient />;
}
