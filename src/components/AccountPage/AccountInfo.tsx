'use client';
import { useTranslations } from 'next-intl';
import { User } from '@/types/user.type';

interface AccountInfoProps {
  user: User;
}

const AccountInfo = ({ user }: AccountInfoProps) => {
  const t = useTranslations('account');

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400 mb-3">
        {t('information')}
      </h2>
      <div className="border border-zinc-800 bg-zinc-900 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">
              {t('username')}
            </p>
            <p className="text-base text-white font-medium break-words">
              {user?.username}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Account ID</p>
            <p className="text-base text-white font-medium break-words">
              #{user?.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfo;
