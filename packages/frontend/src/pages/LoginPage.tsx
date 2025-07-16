import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to='/' />;
  }

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      /* eslint-disable no-undef, no-alert */
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
      /* eslint-enable no-undef, no-alert */
    }
  };

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gray-100'>
      <div className='w-full max-w-md rounded-lg bg-white p-8 shadow-md'>
        <h1 className='mb-6 text-center text-2xl font-bold'>Chronopost</h1>
        <p className='mb-8 text-center text-gray-600'>Schedule posts for Bluesky social network</p>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className='w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50'
        >
          {isLoading ? 'Loading...' : 'Login with Bluesky'}
        </button>
      </div>
    </div>
  );
}
