'use client';

import { useEffect, useState } from 'react';
import { useEnv } from '@/context/EnvContext';
import { AlertCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import storage from '@/lib/storage';
import useAxios from '@/useAxios';

interface VisitHistoryItem {
  path: string;
  visits: number;
  lastVisit: string;
}

const TrackerHistory = ({ csrfToken }: { csrfToken: string }) => {
  const { BACKEND_URL } = useEnv();
  const [visitHistory, setVisitHistory] = useState<VisitHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetting, setResetting] = useState(false);
  const axiosInstance = useAxios();

  const fetchVisitHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get<VisitHistoryItem[]>(
        `${BACKEND_URL}/tracker`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setVisitHistory(response.data);
    } catch (err: unknown) {
      console.error('Error fetching visit history:', err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(`Failed to load visit history: ${err.response.data.message}`);
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load visit history. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAllHistory = async () => {
    setResetting(true);

    try {
      await axiosInstance.post<void>(
        `${BACKEND_URL}/tracker/resetAll`,
        {},
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Refresh the data after reset
      await fetchVisitHistory();
      setShowResetConfirmation(false);
    } catch (err: unknown) {
      console.error('Error resetting visit history:', err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(`Failed to reset visit history: ${err.response.data.message}`);
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to reset visit history. Please try again.');
      }
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchVisitHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Historical Page Visits</h2>
        <div className='flex items-center space-x-4'>
          <button
            onClick={fetchVisitHistory}
            className='flex items-center px-3 py-2 bg-amber-500/10 text-amber-400 rounded-md hover:bg-amber-500/20 transition'
            disabled={loading}
          >
            <RefreshCw
              className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <button
            onClick={() => setShowResetConfirmation(true)}
            className='flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition'
            disabled={loading || resetting}
          >
            <Trash2 className='h-5 w-5 mr-2' />
            Reset All
          </button>
        </div>
      </div>

      {error && (
        <div className='bg-red-100 text-red-700 p-4 rounded-md flex items-center'>
          <AlertCircle className='h-5 w-5 mr-2' />
          {error}
        </div>
      )}

      <div className='bg-zinc-900 shadow rounded-lg overflow-hidden'>
        <div className='px-4 py-5 sm:px-6 bg-zinc-800 flex items-center'>
          <Clock className='h-5 w-5 text-zinc-400 mr-2' />
          <h3 className='text-lg leading-6 font-medium text-zinc-100'>
            Visit History by Page
          </h3>
        </div>
        <div className='border-t border-zinc-700'>
          {loading ? (
            <div className='p-4 text-center'>
              <div className='inline-block animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full mr-2'></div>
              <span className='text-zinc-400'>Loading data...</span>
            </div>
          ) : visitHistory.length > 0 ? (
            <table className='min-w-full divide-y divide-zinc-800'>
              <thead className='bg-zinc-800'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                    Page Path
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                    Total Visits
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider'>
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody className='bg-zinc-900 divide-y divide-zinc-800'>
                {visitHistory
                  .sort((a, b) => b.visits - a.visits)
                  .map((item) => (
                    <tr key={item.path} className='hover:bg-zinc-800'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-zinc-100'>
                        {item.path || '(homepage)'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-400 text-center'>
                        {item.visits}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-zinc-400 text-right'>
                        {formatDate(item.lastVisit)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className='p-4 text-center text-zinc-400'>
              No visit history data available
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-xl'>
            <h3 className='text-lg font-medium text-zinc-100 mb-4'>
              Confirm Reset
            </h3>
            <p className='text-zinc-400 mb-6'>
              Are you sure you want to reset all visit history data? This action
              cannot be undone.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowResetConfirmation(false)}
                className='px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800'
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={resetAllHistory}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <span className='inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2'></span>
                    Resetting...
                  </>
                ) : (
                  'Reset All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerHistory;
