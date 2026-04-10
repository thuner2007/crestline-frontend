'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import useCsrfToken from '@/useCsrfToken';
import storage from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import UrlUtils from '@/lib/urlUtils';
import useAxios from '@/useAxios';

interface LoginResponse {
  access_token: string;
}

interface DeleteAccountModalProps {
  onClose: () => void;
  username: string;
  userId: number;
}

const DeleteAccountModal = ({
  onClose,
  username,
  userId,
}: DeleteAccountModalProps) => {
  const t = useTranslations('account');
  const router = useRouter();
  const locale = useLocale();
  const { logout } = useAuth();
  const { BACKEND_URL } = useEnv();
  const { csrfToken } = useCsrfToken();
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const axiosInstance = useAxios();

  const handleError = (error: unknown) => {
    // Check if error has response property (typical of axios errors)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 403) {
        setDeleteError(t('errors.csrfExpired'));
      } else if (axiosError.response?.status === 401) {
        setDeleteError(t('errors.incorrectPassword'));
      } else if (axiosError.response?.data?.message) {
        setDeleteError(axiosError.response.data.message);
      } else {
        setDeleteError(t('errors.deleteFailed'));
      }
    } else if (error instanceof Error) {
      setDeleteError(error.message);
    } else {
      setDeleteError(t('errors.generic'));
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setIsDeleting(true);

    try {
      // First verify the password
      const verifyResponse = await axiosInstance.post<LoginResponse>(
        `${BACKEND_URL}/auth/login`,
        {
          username: username,
          password,
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

      const { access_token } = verifyResponse.data;

      if (!access_token) {
        throw new Error('Failed to verify password');
      } else {
        // If login was successful, proceed with account deletion
        const accessToken = storage.getItem('access_token');

        // Build delete URL with userId query parameter
        const deleteUrl = UrlUtils.buildApiUrl(
          BACKEND_URL,
          `/users/${userId}`,
          { userId }
        );

        await axiosInstance.request({
          method: 'DELETE',
          url: deleteUrl,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
          data: { password },
        });

        logout();
        router.push(`/${locale}/register`);
      }
    } catch (error: unknown) {
      handleError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-zinc-950/80 flex items-center justify-center p-4 z-50'>
      <div className='border border-zinc-800 bg-zinc-900 p-6 max-w-md w-full'>
        <h3 className='text-xl font-bold uppercase tracking-tight text-white mb-2'>{t('deleteAccount')}</h3>
        <p className='text-zinc-400 text-sm mb-5'>{t('deleteAccountPrompt')}</p>
        {deleteError && (
          <p className='text-red-400 text-sm mb-4 border border-red-500/30 bg-red-500/10 px-3 py-2'>{deleteError}</p>
        )}
        <form onSubmit={handleDeleteAccount}>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('enterPassword')}
            className='w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none mb-5'
            required
          />
          <div className='flex justify-end gap-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-zinc-400 hover:text-zinc-200 text-xs uppercase tracking-widest font-semibold transition-colors'
            >
              {t('cancel')}
            </button>
            <button
              type='submit'
              disabled={isDeleting}
              className='px-5 py-2.5 border border-red-500 bg-red-500/10 text-red-400 font-bold uppercase tracking-widest text-xs hover:bg-red-500/20 hover:border-red-400 disabled:opacity-50 transition-colors'
            >
              {isDeleting ? t('deleting') : t('deleteAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
