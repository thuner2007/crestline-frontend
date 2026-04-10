import { useTranslations } from 'next-intl';

export default function ShipCostInfo() {
  const t = useTranslations('ShipCostInfo');

  return (
    <div className='w-full bg-purple-700 text-white py-2'>
      <div className='container mx-auto px-4 text-center text-sm font-medium'>
        {t('freeShippingMessage', { amount: 'CHF 100' })}
      </div>
    </div>
  );
}
