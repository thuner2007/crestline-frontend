'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useCsrfToken from '@/useCsrfToken';
import axios from 'axios';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import storage from '@/lib/storage';
import useAxios from '@/useAxios';

const RegisterPage = () => {
  const t = useTranslations('register');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasUpperCase: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const router = useRouter();
  const { csrfToken } = useCsrfToken();
  const { user } = useAuth();

  const locale = useLocale();

  const axiosInstance = useAxios();

  useEffect(() => {
    // If user is already logged in, redirect to home page
    if (user?.username) {
      router.replace('/');
    }
  }, [user, router]);

  // If user is already logged in, don't render the login form
  if (user?.username) {
    return null; // or return a loading spinner
  }

  const handleRegisterError = (error: unknown): string => {
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
      const message =
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data
          ? String((error.response.data as { message: unknown }).message)
          : '';

      switch (status) {
        case 403:
          return t('errors.csrfExpired');
        case 409:
          return t('errors.emailExists');
        case 400:
          return t('errors.invalidEmail');
        case 500:
          return t('errors.serverError');
        default:
          return message
            ? `${t('errors.generic')}: ${message}`
            : t('errors.generic');
      }
    }

    // Check for network errors
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'NETWORK_ERROR'
    ) {
      return t('errors.networkError');
    }

    return t('errors.generic');
  };

  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);

    // Update real-time validation state
    setPasswordValidation({
      hasMinLength,
      hasUpperCase,
    });

    if (!hasMinLength || !hasUpperCase) {
      setValidationError(t('errors.passwordRequirements'));
      return false;
    }

    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Clear validation error if password becomes valid
    if (newPassword) {
      const hasMinLength = newPassword.length >= 8;
      const hasUpperCase = /[A-Z]/.test(newPassword);

      setPasswordValidation({
        hasMinLength,
        hasUpperCase,
      });

      if (hasMinLength && hasUpperCase) {
        setValidationError('');
      }
    } else {
      setPasswordValidation({
        hasMinLength: false,
        hasUpperCase: false,
      });
      setValidationError('');
    }

    // Check if passwords match
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordsMatch(false);
    } else {
      setPasswordsMatch(true);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    // Check if passwords match
    if (password && newConfirmPassword !== password) {
      setPasswordsMatch(false);
    } else {
      setPasswordsMatch(true);
    }
  };

  const validateForm = (): boolean => {
    // Clear previous validation errors
    setValidationError('');
    setError('');

    if (!validatePassword(password)) {
      return false;
    }

    if (!passwordsMatch || password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      setPasswordsMatch(false);
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    if (!validateForm()) {
      return;
    }

    try {
      if (!csrfToken) {
        throw new Error(t('errors.csrfExpired'));
      }

      const registerResponse = await axiosInstance.post<{ success: boolean }>(
        `/users`,
        { username: email, password },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

      // Check if registration was successful
      if (!registerResponse.data) {
        throw new Error('Registration failed');
      }

      // Proceed with login using the registered credentials
      const loginResponse = await axiosInstance.post<{
        access_token: string;
        refresh_token: string;
      }>(
        `/auth/login`,
        { username: email, password },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

      const { access_token, refresh_token } = loginResponse.data;

      // Store tokens only if user has consented to cookies
      const hasConsented = storage.getItem('cookieConsent');
      const hasOptionalConsented = storage.getItem('optionalCookieConsent');
      if (hasConsented === 'true' || hasOptionalConsented === 'true') {
        storage.setItem('access_token', access_token);
        storage.setItem('refresh_token', refresh_token);
      }

      // Set Authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      const userResponse = await axiosInstance.get<{
        data: {
          id: string;
          username: string;
          role: string;
          createdAt: string;
        };
      }>(`/users/me`, {
        headers: {
          Authorization: `Bearer ${loginResponse.data.access_token}`,
          'X-CSRF-Token': csrfToken,
        },
        withCredentials: true,
      });

      const userData = {
        id: userResponse.data.data.id,
        username: userResponse.data.data.username,
        role: userResponse.data.data.role,
        createdAt: userResponse.data.data.createdAt,
      };

      if (hasConsented === 'true' || hasOptionalConsented === 'true') {
        storage.setItem('userData', JSON.stringify(userData));
      }

      // Wait for the auth context to update before redirecting
      await new Promise((resolve) => setTimeout(resolve, 100));

      window.location.href = `/${locale}/`;
    } catch (error: unknown) {
      setError(handleRegisterError(error));
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-md'>
        <h2 className='text-2xl font-bold mb-6'>{t('title')}</h2>
        {error && (
          <div className='mb-4 p-3 rounded bg-red-50 border border-red-200'>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-red-400'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='text-red-700 text-sm'>{error}</span>
            </div>
          </div>
        )}
        {validationError && (
          <div className='mb-4 p-3 rounded bg-red-50 border border-red-200'>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-red-400'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='text-red-700 text-sm'>{validationError}</span>
            </div>
          </div>
        )}{' '}
        <form onSubmit={handleRegister}>
          <div className='mb-4'>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-gray-700'
            >
              {t('email')}
            </label>
            <input
              type='email'
              id='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm'
              required
            />
          </div>
          <div className='mb-4'>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-gray-700'
            >
              {t('password')}
            </label>
            <input
              type='password'
              id='password'
              value={password}
              onChange={handlePasswordChange}
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm'
              required
            />
            <div className='mt-2 space-y-1'>
              <div
                className={`flex items-center text-xs ${
                  passwordValidation.hasMinLength
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                <span className='mr-2'>
                  {passwordValidation.hasMinLength ? '✓' : '○'}
                </span>
                {t('passwordMinLength')}
              </div>
              <div
                className={`flex items-center text-xs ${
                  passwordValidation.hasUpperCase
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`}
              >
                <span className='mr-2'>
                  {passwordValidation.hasUpperCase ? '✓' : '○'}
                </span>
                {t('passwordUpperCase')}
              </div>
            </div>
          </div>
          <div className='mb-4'>
            <label
              htmlFor='confirmPassword'
              className='block text-sm font-medium text-gray-700'
            >
              {t('confirmPassword')}
            </label>
            <input
              type='password'
              id='confirmPassword'
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-600 focus:border-purple-600 sm:text-sm ${
                !passwordsMatch && confirmPassword
                  ? 'border-red-300'
                  : 'border-gray-300'
              }`}
              required
            />
            {!passwordsMatch && confirmPassword && (
              <p className='mt-1 text-xs text-red-600'>
                {t('errors.passwordMismatch')}
              </p>
            )}
          </div>
          <button
            type='submit'
            className='w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600'
          >
            {t('title')}
          </button>
        </form>
        <div className='mt-4 text-center'>
          <p className='text-sm text-gray-600'>
            {t('haveAccount')}{' '}
            <Link
              href={`/${locale}/login`}
              className='text-purple-600 hover:underline'
            >
              {t('loginHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
