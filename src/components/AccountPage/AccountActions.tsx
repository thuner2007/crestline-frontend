'use client';
import { useTranslations } from 'next-intl';

interface AccountActionsProps {
  onChangePassword: () => void;
  onDeleteAccount: () => void;
}

const AccountActions = ({
  onChangePassword,
  onDeleteAccount,
}: AccountActionsProps) => {
  const t = useTranslations('account');

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400 mb-3">
        {t('actions')}
      </h2>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <button
          onClick={onChangePassword}
          className="px-5 py-2.5 bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest text-xs hover:bg-amber-400 transition-colors cursor-pointer w-full sm:w-auto"
        >
          {t('changePassword')}
        </button>
        <button
          onClick={onDeleteAccount}
          className="px-5 py-2.5 border border-red-500/50 bg-red-500/10 text-red-400 font-bold uppercase tracking-widest text-xs hover:border-red-400 hover:bg-red-500/20 transition-colors cursor-pointer w-full sm:w-auto"
        >
          {t('deleteAccount')}
        </button>
      </div>
    </div>
  );
};

export default AccountActions;
