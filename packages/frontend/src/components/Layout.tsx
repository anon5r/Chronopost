import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center'>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to='/auth/login' />;
  }

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Header */}
      <header className='bg-blue-600 text-white shadow'>
        <div className='container mx-auto flex items-center justify-between px-4 py-4'>
          <div className='text-xl font-bold'>Chronopost</div>
          <div className='flex items-center space-x-4'>
            {user && (
              <div className='text-sm'>
                <span>@{user.handle}</span>
              </div>
            )}
            <button
              onClick={() => logout()}
              className='rounded-md bg-blue-700 px-3 py-1.5 text-sm hover:bg-blue-800'
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className='flex-1 bg-gray-50'>{children}</main>

      {/* Footer */}
      <footer className='bg-gray-800 py-4 text-center text-sm text-gray-400'>
        <div className='container mx-auto'>
          <p>Chronopost - Bluesky Scheduled Posting</p>
        </div>
      </footer>
    </div>
  );
}
