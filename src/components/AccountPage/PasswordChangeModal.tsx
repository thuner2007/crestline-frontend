'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useCsrfToken from '@/useCsrfToken';
import { useEnv } from '@/context/EnvContext';
import storage from '@/lib/storage';
import UrlUtils from '@/lib/urlUtils';
import useAxios from '@/useAxios';

interface PasswordChangeModalProps {
  onClose: () => void;
  userId: number;
}

const PasswordChangeModal = ({ onClose, userId }: PasswordChangeModalProps) => {
  const t = useTranslations('account');
  const { BACKEND_URL } = useEnv();
  const { csrfToken } = useCsrfToken();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const axiosInstance = useAxios();

  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);

    if (!hasMinLength || !hasUpperCase) {
      setValidationError(t('errors.passwordRequirements'));
      return false;
    }

    return true;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setValidationError('');

    if (!validatePassword(newPassword)) {
      return;
    }

    setIsChangingPassword(true);

    try {
      // Build update URL with userId query parameter
      const updateUrl = UrlUtils.buildApiUrl(
        BACKEND_URL,
        `/users/${userId}/password`,
        { userId }
      );

      await axiosInstance.put<{ success: boolean }>(
        updateUrl,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

      // Clear form and close modal on success
      setOldPassword('');
      setNewPassword('');
      onClose();
    } catch (error) {
      // Type guard for axios-like errors
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response
      ) {
        const status = (error.response as { status: number }).status;
        if (status === 401) {
          setPasswordError(t('errors.incorrectPassword'));
        } else {
          const message =
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'message' in error.response.data
              ? String((error.response.data as { message: unknown }).message)
              : '';
          setPasswordError(message || t('errors.changeFailed'));
        }
      } else if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'NETWORK_ERROR'
      ) {
        setPasswordError(t('errors.network'));
      } else {
        setPasswordError(t('errors.generic'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-zinc-950/80 flex items-center justify-center p-4 z-50'>
      <div className='border border-zinc-800 bg-zinc-900 p-6 max-w-md w-full'>
        <h3 className='text-xl font-bold uppercase tracking-tight text-white mb-5'>{t('changePassword')}</h3>
        {passwordError && (
          <p className='text-red-400 text-sm mb-4 border border-red-500/30 bg-red-500/10 px-3 py-2'>{passwordError}</p>
        )}
        {validationError && (
          <p className='text-amber-400 text-sm mb-4 border border-amber-500/30 bg-amber-500/10 px-3 py-2'>{validationError}</p>
        )}
        <form onSubmit={handlePasswordChange}>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='oldPassword'
                className='block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5'
              >
                {t('currentPassword')}
              </label>
              <input
                id='oldPassword'
                type='password'
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className='w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none'
                required
              />
            </div>
            <div>
              <label
                htmlFor='newPassword'
                className='block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5'
              >
                {t('newPassword')}
              </label>
              <input
                id='newPassword'
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className='w-full px-3 py-2.5 border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none'
                required
              />
            </div>
          </div>
          <div className='flex justify-end gap-4 mt-6'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-zinc-400 hover:text-zinc-200 text-xs uppercase tracking-widest font-semibold transition-colors'
            >
              {t('cancel')}
            </button>
            <button
              type='submit'
              disabled={isChangingPassword}
              className='px-5 py-2.5 bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors'
            >
              {isChangingPassword ? t('changing') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
