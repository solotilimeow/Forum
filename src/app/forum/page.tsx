'use client';

// main forum page - shows all posts and lets you make new ones

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoleBadge from '@/components/RoleBadge';
import SessionTimeout from '@/components/SessionTimeout';

interface Post {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  username: string;
  role: string;
  comment_count: number;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function ForumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', image_url: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const onFocus = () => loadPosts();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const loadData = async () => {
    try {
      const [meRes, postsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/posts'),
      ]);
      if (!meRes.ok) { router.push('/login'); return; }
      const meData = await meRes.json();
      setUser(meData.user);
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          image_url: newPost.image_url || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewPost({ title: '', content: '', image_url: '' });
        loadPosts();
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        alert(data.error || 'Failed to create post');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDeletePost = async (postId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this post and all its comments?')) return;
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) loadPosts();
    else alert('Failed to delete post');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isMod = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Session Timeout Warning */}
      <SessionTimeout />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forum</h1>
            {user && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">Logged in as <strong>{user.username}</strong></span>
                <RoleBadge role={user.role} size="sm" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
              Settings
            </Link>
            {isMod && (
              <Link href="/audit" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                Audit Log
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-semibold">
                Admin Panel
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* New Post Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Create New Post</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
              <input
                type="url"
                value={newPost.image_url}
                onChange={(e) => setNewPost({ ...newPost, image_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Post
            </button>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>

          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No posts yet. Be the first to post!
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="relative bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                <Link href={`/forum/post/${post.id}`} className="block">
                  <div className="flex items-start gap-4">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold truncate">{post.title}</h3>
                        <RoleBadge role={post.role} size="sm" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-medium">{post.username}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>{post.comment_count} comments</span>
                      </div>
                    </div>
                  </div>
                </Link>
                {isMod && (
                  <button
                    onClick={(e) => handleDeletePost(post.id, e)}
                    className="absolute top-3 right-3 px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
