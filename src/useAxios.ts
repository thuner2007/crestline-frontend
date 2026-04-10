'use client';
import axios from 'axios';
import storage from './lib/storage';
import { useEnv } from '@/context/EnvContext';

const useAxios = () => {
  const { BACKEND_URL } = useEnv();

  // Create a custom axios instance
  const axiosInstance = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include tokens in every request
  axiosInstance.interceptors.request.use((config) => {
    // Ensure headers object exists
    config.headers = config.headers || {};

    // Add access token if available
    const token = storage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if available and not already set
    if (!config.headers['X-CSRF-Token']) {
      const csrfToken = storage.getItem('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  });

  // Create a response interceptor that handles token refresh
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 (unauthorized) and we haven't tried to refresh yet
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        // @ts-expect-error - This is added to window by AuthContext
        window.__refreshTokenIfNeeded
      ) {
        originalRequest._retry = true;
        console.log('401 error detected, attempting token refresh');

        try {
          // Try to refresh the token using the function from AuthContext
          // @ts-expect-error - This is added to window by AuthContext
          const token = await window.__refreshTokenIfNeeded();

          if (token) {
            console.log('Token refreshed successfully, retrying request');
            // Update authorization header
            originalRequest.headers.Authorization = `Bearer ${token}`;
            // Retry the original request
            return axiosInstance(originalRequest);
          } else {
            console.log('Token refresh failed - no token returned');
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }

      // Otherwise, just reject with the original error
      return Promise.reject(error);
    }
  );
  return axiosInstance;
};

export default useAxios;
