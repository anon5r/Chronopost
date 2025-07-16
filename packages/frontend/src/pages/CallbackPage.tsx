// React is needed for JSX
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface ErrorResponse {
  message: string;
}

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsLoading(true);

        // Get code and state from URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        // Get code verifier from cookie
        const codeVerifier = document.cookie
          .split('; ')
          .find((row: string) => row.startsWith('code_verifier='))
          ?.split('=')[1];

        if (!code || !state || !codeVerifier) {
          throw new Error('Missing required parameters');
        }

        // Exchange code for tokens
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code, state, codeVerifier }),
        });

        if (!response.ok) {
          const data = await response.json() as ErrorResponse;
          throw new Error(data.message || 'Authentication failed');
        }

        // Redirect to dashboard on success
        navigate('/');
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (isLoading) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center'>
        <div className='text-center'>
          <h1 className='mb-4 text-xl font-bold'>Authenticating...</h1>
          <p className='text-gray-600'>Please wait while we complete the authentication process.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center'>
        <div className='w-full max-w-md rounded-lg bg-white p-8 shadow-md'>
          <h1 className='mb-4 text-center text-xl font-bold text-red-500'>Authentication Error</h1>
          <p className='mb-6 text-center text-gray-600'>{error}</p>
          <div className='text-center'>
            <button
              onClick={() => navigate('/auth/login')}
              className='rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
