'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Tag } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AnaniaPageClient() {
  const t = useTranslations('anania');
  const { locale } = useParams();

  return (
    <div className='min-h-screen bg-white'>
      {/* Hero Section */}
      <div className='relative bg-gradient-to-r from-purple-800 to-purple-900 py-20 px-4 sm:px-6 lg:px-8'>
        <div className='absolute inset-0 opacity-10'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          ></div>
        </div>
        <div className='max-w-7xl mx-auto text-center'>
          <h1 className='text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl'>
            Revsticks x Anania.ch - Collaboration
          </h1>
          <p className='mt-6 max-w-2xl mx-auto text-xl text-purple-100'>
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Silver Promotional Banner */}
      <div className='py-4 px-4 sm:px-6 lg:px-8 border-t-2 border-gray-400 border-b-2'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex items-center justify-center'>
            <div className='inline-flex items-center bg-white bg-opacity-90 px-6 py-3 rounded-full shadow-lg border-2 border-gray-400'>
              <Tag className='h-5 w-5 text-purple-700 mr-2' />
              <span className='text-lg font-bold text-gray-800'>
                10% Code:
                <span className='text-purple-700 ml-1 font-extrabold tracking-wider'>
                  AS-REVSTICKS
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logo Section with Enhanced Styling */}
      <div className='py-16 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16'>
            <div className='w-48 h-48 relative group transition-transform duration-300 hover:scale-105'>
              <div className='absolute inset-0 bg-black bg-opacity-5 rounded-lg'></div>
              <Image
                src='/512x512.png'
                alt='Revsticks Logo'
                fill
                className='object-contain p-4'
                sizes='(max-width: 640px) 100vw, 192px'
                priority
                unoptimized={true}
              />
            </div>
            <div className='text-3xl font-bold text-purple-600 transform transition-transform hover:scale-110 duration-300'>
              X
            </div>
            <div className='w-48 h-48 relative group transition-transform duration-300 hover:scale-105'>
              <div className='absolute inset-0 bg-black bg-opacity-5 rounded-lg'></div>
              <Image
                src='/anania_logo.jpeg'
                alt='Anania.ch Logo'
                fill
                className='object-contain p-4'
                sizes='(max-width: 640px) 100vw, 192px'
                priority
                unoptimized={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className='py-16 bg-gray-50'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='bg-white shadow-xl rounded-lg overflow-hidden'>
            <div className='p-8'>
              <h2 className='text-3xl font-bold text-gray-900 mb-6'>
                {t('about')}
              </h2>
              <div className='prose prose-lg max-w-none text-gray-600'>
                <p>{t('description')}</p>
              </div>
              <div className='mt-8'>
                <a
                  href='https://anania.ch'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-700 hover:bg-purple-800 transition-colors transform hover:scale-105 duration-300'
                >
                  {t('visitWebsite')}
                  <ExternalLink className='ml-2 h-5 w-5' />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className='bg-gradient-to-r from-purple-800 to-purple-900 py-12 relative overflow-hidden'>
        {/* Decorative elements */}
        <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-30'></div>
        <div className='absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-30'></div>

        {/* Subtle pattern overlay */}
        <div
          className='absolute inset-0 opacity-5'
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        ></div>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <h2 className='text-3xl font-extrabold text-white sm:text-4xl'>
              {t('ctaTitle')}
            </h2>
            <p className='mt-4 text-lg leading-6 text-purple-100'>
              {t('ctaDescription')}
            </p>
            <div className='mt-8 flex justify-center gap-4'>
              <Link
                href={`/${locale}/stickers`}
                className='inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-purple-900 bg-white hover:bg-purple-50 transition-colors transform hover:scale-105 duration-300'
              >
                {t('exploreStickers')}
              </Link>
              <Link
                href={`/${locale}/parts`}
                className='inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 bg-opacity-60 hover:bg-opacity-80 transition-colors transform hover:scale-105 duration-300'
              >
                {t('exploreParts')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
