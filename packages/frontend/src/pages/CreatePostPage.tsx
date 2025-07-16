import React, { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ErrorResponse {
  message: string;
}

export function CreatePostPage() {
  // We're using useAuth() but not extracting user yet
  const { } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (!scheduledAt) {
      setError('Please select a date and time');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json() as ErrorResponse;
        throw new Error(data.message || 'Failed to create post');
      }

      // Navigate back to the dashboard on success
      navigate('/');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate min datetime (now + 5 minutes to prevent immediate scheduling)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold'>Create Scheduled Post</h1>
      </div>

      <div className='rounded-lg bg-white p-6 shadow-md'>
        {error && (
          <div className='mb-4 rounded-md bg-red-50 p-4 text-red-800'>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label htmlFor='content' className='mb-2 block font-medium'>
              Post Content
            </label>
            <textarea
              id='content'
              value={content}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              className='w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none'
              rows={4}
              maxLength={300}
              placeholder="What's on your mind?"
              required
            />
            <p className='mt-1 text-right text-sm text-gray-500'>{content.length}/300 characters</p>
          </div>

          <div className='mb-6'>
            <label htmlFor='scheduledAt' className='mb-2 block font-medium'>
              Schedule For
            </label>
            <input
              id='scheduledAt'
              type='datetime-local'
              value={scheduledAt}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
              min={getMinDateTime()}
              className='w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:outline-none'
              required
            />
            <p className='mt-1 text-sm text-gray-500'>
              Select a future date and time (at least 5 minutes from now)
            </p>
          </div>

          <div className='flex justify-end space-x-4'>
            <button
              type='button'
              onClick={() => navigate('/')}
              className='rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50'
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
