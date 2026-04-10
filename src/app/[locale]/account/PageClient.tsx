'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Oswald, DM_Sans } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import storage from '@/lib/storage';
import AccountActions from '@/components/AccountPage/AccountActions';
import AccountInfo from '@/components/AccountPage/AccountInfo';
import DeleteAccountModal from '@/components/AccountPage/DeleteAccountModal';
import PasswordChangeModal from '@/components/AccountPage/PasswordChangeModal';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const AccountClientPage = () => {
  const t = useTranslations('account');
  const router = useRouter();
  const locale = useLocale();
  const { user, logout, refreshUserData } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Function to refresh user data and handle errors
  const handleRefreshUserData = async () => {
    try {
      await refreshUserData();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails, logout the user
      handleLogout();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user?.username) {
        router.push(`/${locale}/login`);
      } else {
        // Refresh user data and token when component mounts
        handleRefreshUserData();
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, router, locale]);

  // Refresh user data every 10 minutes while on account page
  useEffect(() => {
    if (user?.username) {
      const refreshInterval = setInterval(() => {
        handleRefreshUserData();
      }, 10 * 60 * 1000); // 10 minutes

      return () => clearInterval(refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const handleLogout = () => {
    // Get current locale before logout
    const currentLocale = locale;

    logout();

    // Navigate to login in the same language
    router.push(`/${currentLocale}/login`);
    storage.removeItem('access_token');
    storage.removeItem('refresh_token');
    storage.removeItem('userData');
  };

  if (!user?.username) {
    return null;
  }

  return (
    <div className={`w-full min-h-[80vh] bg-zinc-950 px-4 py-12 md:py-16 ${oswald.variable} ${dmSans.variable}`} style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mx-auto max-w-3xl">
        {/* Page heading */}
        <div className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>
            — {t('information')}
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              {t('details')}
            </h1>
            <button
              onClick={handleLogout}
              className="shrink-0 border border-red-500/40 bg-red-500/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 hover:border-red-400"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('logout')}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AccountInfo user={user} />
          <AccountActions
            onChangePassword={() => setShowPasswordModal(true)}
            onDeleteAccount={() => setShowDeleteModal(true)}
          />
        </div>
      </div>

      {showPasswordModal && (
        <PasswordChangeModal
          onClose={() => {
            setShowPasswordModal(false);
            handleRefreshUserData();
          }}
          userId={user.id}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => {
            setShowDeleteModal(false);
            handleRefreshUserData();
          }}
          username={user.username}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default AccountClientPage;
