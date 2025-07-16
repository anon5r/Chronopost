// React is needed for JSX
import { useEffect, useState, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { ScheduledPost, PostStatus } from 'shared';

interface PostsResponse {
  posts: ScheduledPost[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const url = new URL(`${import.meta.env.VITE_API_URL}/api/posts`);
        if (statusFilter) {
          url.searchParams.append('status', statusFilter);
        }

        const response = await fetch(url.toString(), {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json() as PostsResponse;
        setPosts(data.posts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPosts();
    }
  }, [user, statusFilter]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: PostStatus) => {
    const classes = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Your Scheduled Posts</h1>
        <Link
          to='/posts/new'
          className='rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
        >
          Create New Post
        </Link>
      </div>

      <div className='mb-6'>
        <label className='mr-2 font-medium'>Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as PostStatus | '')}
          className='rounded-md border border-gray-300 px-3 py-2'
        >
          <option value=''>All</option>
          <option value='PENDING'>Pending</option>
          <option value='PROCESSING'>Processing</option>
          <option value='COMPLETED'>Completed</option>
          <option value='FAILED'>Failed</option>
          <option value='CANCELLED'>Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <p className='text-center'>Loading posts...</p>
      ) : error ? (
        <p className='text-center text-red-500'>{error}</p>
      ) : posts.length === 0 ? (
        <div className='rounded-lg bg-gray-50 p-8 text-center'>
          <p className='text-gray-600'>No posts found. Create your first scheduled post!</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                  Content
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                  Scheduled For
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white'>
              {posts.map(post => (
                <tr key={post.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4'>
                    <div className='max-w-xs truncate'>{post.content}</div>
                  </td>
                  <td className='whitespace-nowrap px-6 py-4'>{formatDate(post.scheduledAt)}</td>
                  <td className='px-6 py-4'>{getStatusBadge(post.status)}</td>
                  <td className='whitespace-nowrap px-6 py-4'>{formatDate(post.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
