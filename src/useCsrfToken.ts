import { useState, useEffect } from 'react';
import axios from 'axios';
import storage from './lib/storage';
import { useEnv } from './context/EnvContext';

interface CsrfTokenResponse {
  token: string;
}

const useCsrfToken = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const { BACKEND_URL } = useEnv();

  const fetchCsrfToken = async () => {
    try {
      const response = await axios.get<CsrfTokenResponse>(
        `${BACKEND_URL}/users/csrf-token`,
        {
          withCredentials: true,
        }
      );
      const token = response.data.token;
      storage.setItem('csrf_token', token);
      setCsrfToken(token);
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
  };

  useEffect(() => {
    fetchCsrfToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once when component mounts

  return { csrfToken };
};

export default useCsrfToken;
