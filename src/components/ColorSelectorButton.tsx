'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Palette } from 'lucide-react';
import { motion } from 'framer-motion';

interface ColorSelectorButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ColorSelectorButton({
  variant = 'primary',
  size = 'md',
  className = '',
}: ColorSelectorButtonProps) {
  const t = useTranslations('powdercoatColors');
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    // Extract locale from current pathname
    const pathSegments = pathname.split('/');
    const locale = pathSegments[1] || 'en';

    // Navigate to powdercoat-colors page
    router.push(`/${locale}/powdercoat-colors`);
  };

  // Style variants
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300',
    outline: 'bg-transparent text-blue-600 hover:bg-blue-50 border-blue-600',
  };

  // Size variants
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        inline-flex items-center gap-2 
        ${variants[variant]} 
        ${sizes[size]}
        border rounded-lg font-medium 
        transition-all duration-200 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${className}
      `}
    >
      <Palette className={iconSizes[size]} />
      {t('selectColorButton')}
    </motion.button>
  );
}
