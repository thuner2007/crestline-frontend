'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useEnv } from '@/context/EnvContext';
import { RefreshCw, Activity, Users, Clock } from 'lucide-react';

interface PathCount {
  [path: string]: number;
}

const Tracker = ({ csrfToken }: { csrfToken: string }) => {
  const { BACKEND_URL } = useEnv();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [totalConnected, setTotalConnected] = useState<number>(0);
  const [pathCounts, setPathCounts] = useState<PathCount>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!BACKEND_URL) {
      setError('Backend URL is not defined');
      return;
    }

    // Connect to the socket.io server with the proper namespace
    const socketInstance = io(`${BACKEND_URL}/tracker`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      query: {
        // Make sure the server knows this is an admin connection
        isAdmin: 'true',
      },
    });

    socketInstance.on('connect', () => {
      console.log(
        'Connected to tracker socket for admin panel',
        socketInstance.id
      );
      // Explicitly tell the server this is an admin connection with CSRF token
      socketInstance.emit('registerAdmin', { csrfToken });
      refreshData(socketInstance);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
    });

    socketInstance.on('connectedCount', (data) => {
      setTotalConnected(data.count);
      setLoading(false);
    });

    socketInstance.on('connectedCountsByPath', (data) => {
      setPathCounts(data);
      setLastUpdated(new Date());
      setLoading(false);
    });

    setSocket(socketInstance);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      socketInstance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BACKEND_URL]);

  // Set up auto-refresh and countdown
  useEffect(() => {
    // Clear existing intervals
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (socket && autoRefresh) {
      // Set up auto-refresh interval
      autoRefreshIntervalRef.current = setInterval(() => {
        refreshData(socket);
        // Reset countdown when refresh happens
        setCountdown(10);
      }, 10000); // Refresh every 10 seconds

      // Set up countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 10));
      }, 1000);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [socket, autoRefresh]);

  // Refresh data function
  const refreshData = (socketInstance: Socket) => {
    setLoading(true);
    socketInstance.emit('getConnectedCount');
    socketInstance.emit('getConnectedCountsByPath');
    // Reset countdown
    setCountdown(10);

    // Add a safety timeout to ensure loading state doesn't get stuck
    setTimeout(() => {
      setLoading(false);
    }, 5000); // 5-second timeout as a fallback
  };

  // Format the last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Real-time Visitor Tracker</h2>
        <div className='flex items-center space-x-4'>
          <div className='flex items-center bg-gray-50 p-2 rounded-lg'>
            <input
              type='checkbox'
              id='autoRefresh'
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className='mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded'
            />
            <label
              htmlFor='autoRefresh'
              className='text-sm text-gray-700 flex items-center'
            >
              <Clock className='h-4 w-4 mr-1 text-purple-600' />
              Auto-refresh
              {autoRefresh && (
                <span className='ml-1 bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full'>
                  {countdown}s
                </span>
              )}
            </label>
          </div>
          <button
            onClick={() => socket && refreshData(socket)}
            className='flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition'
            disabled={loading}
          >
            <RefreshCw
              className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className='bg-red-100 text-red-700 p-4 rounded-md'>{error}</div>
      ) : (
        <>
          <div className='bg-purple-50 p-4 rounded-lg flex items-center'>
            <Users className='h-8 w-8 text-purple-700 mr-3' />
            <div>
              <div className='text-lg font-medium text-purple-800'>
                Total Visitors Online:{' '}
                <span className='text-2xl font-bold'>{totalConnected}</span>
              </div>
              <div className='text-sm text-gray-500 mt-1'>
                Last updated: {formatLastUpdated()}
              </div>
            </div>
          </div>

          <div className='bg-white shadow rounded-lg overflow-hidden'>
            <div className='px-4 py-5 sm:px-6 bg-gray-50 flex items-center'>
              <Activity className='h-5 w-5 text-gray-500 mr-2' />
              <h3 className='text-lg leading-6 font-medium text-gray-900'>
                Visitors by Page
              </h3>
            </div>
            <div className='border-t border-gray-200'>
              {loading ? (
                <div className='p-4 text-center'>
                  <div className='inline-block animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mr-2'></div>
                  <span className='text-gray-500'>Loading data...</span>
                </div>
              ) : Object.keys(pathCounts).length > 0 ? (
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Page Path
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Visitors
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {Object.entries(pathCounts)
                      .sort(([, countA], [, countB]) => countB - countA)
                      .map(([path, count]) => (
                        <tr key={path} className='hover:bg-gray-50'>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {path}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 text-right'>
                            {count}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className='p-4 text-center text-gray-500'>
                  No visitors currently active
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Tracker;
