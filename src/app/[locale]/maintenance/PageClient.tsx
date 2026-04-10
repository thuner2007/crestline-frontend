'use client';

import NextImage from 'next/image';
import { useTranslations } from 'next-intl';

export default function MaintenancePageClient() {
  const t = useTranslations('maintenance');

  return (
    <>
      {/* Full screen overlay with maximum priority */}
      <div 
        className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 2147483647, // Maximum safe z-index value
          margin: 0,
          padding: '1rem',
          overflow: 'hidden',
          background: 'linear-gradient(to bottom, #111827, #000000)',
        }}
      >

      <div 
        className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center transform transition-all animate-fade-in-up relative"
        style={{ zIndex: 2147483647 }}
      >
        <div className="mb-8 relative">
          <div className="w-32 h-32 mx-auto relative">
            <NextImage
              src="/512x512.png"
              alt="RevSticks Logo"
              width={128}
              height={128}
              className="absolute inset-0 w-full h-full object-contain"
              priority={true}
              draggable={false}
              unoptimized={true}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {t('title') || "We'll Be Back Soon"}
        </h1>

        <div className="w-16 h-1 bg-purple-600 mx-auto mb-6"></div>

        <p className="text-gray-600 mb-8">
          {t('message') ||
            "We're currently undergoing scheduled maintenance to improve our services. Please check back soon."}
        </p>

        <div className="mt-8 animate-pulse flex justify-center">
          <div className="h-2 w-2 bg-purple-600 rounded-full mx-1"></div>
          <div className="h-2 w-2 bg-purple-600 rounded-full mx-1 animation-delay-200"></div>
          <div className="h-2 w-2 bg-purple-600 rounded-full mx-1 animation-delay-400"></div>
        </div>
      </div>
    </div>
    </>
  );
}
