'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RoleBadge from '@/components/RoleBadge';

interface Comment {
  id: number;
  post_id: number;
  parent_id: number | null;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  role: string;
  replies?: Comment[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  username: string;
  role: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = Number(params.id);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  const isMod = currentUser?.role === 'moderator' || currentUser?.role === 'admin';

  useEffect(() => {
    loadAll();
    const onFocus = () => loadPost();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [postId]);

  const loadAll = async () => {
    try {
      const [meRes, postRes, commentsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/posts/${postId}`),
        fetch(`/api/posts/${postId}/comments`),
      ]);

      if (!meRes.ok) { router.push('/login'); return; }
      setCurrentUser((await meRes.json()).user);

      if (postRes.ok) {
        setPost((await postRes.json()).post);
      } else if (postRes.status === 404) {
        router.push('/forum');
        return;
      }

      if (commentsRes.ok) {
        setComments(buildCommentTree((await commentsRes.json()).comments));
      }
    } catch (err) {
      console.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadPost = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`/api/posts/${postId}`),
        fetch(`/api/posts/${postId}/comments`),
      ]);
      if (postRes.ok) setPost((await postRes.json()).post);
      if (commentsRes.ok) setComments(buildCommentTree((await commentsRes.json()).comments));
    } catch (err) {
      console.error('Failed to reload post');
    }
  };

  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const roots: Comment[] = [];

    flatComments.forEach(c => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    flatComments.forEach(c => {
      const comment = commentMap.get(c.id)!;
      if (c.parent_id && commentMap.has(c.parent_id)) {
        const parent = commentMap.get(c.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return roots;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        setNewComment('');
        loadPost();
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      alert('Failed to post comment');
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parent_id: parentId }),
      });

      if (res.ok) {
        setReplyContent('');
        setReplyTo(null);
        loadPost();
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      alert('Failed to post reply');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment and all its replies?')) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) loadPost();
    else alert('Failed to delete comment');
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post and all its comments?')) return;
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) router.push('/forum');
    else alert('Failed to delete post');
  };

  const handleBanUser = async (username: string, userId: number, isBanned: boolean) => {
    const action = isBanned ? 'unban' : 'ban';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${username}"?`)) return;
    const res = await fetch(`/api/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban: !isBanned }),
    });
    if (!res.ok) alert(`Failed to ${action} user`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.username}</span>
            <RoleBadge role={comment.role} size="sm" />
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          {isMod && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {comment.role !== 'admin' &&
               (currentUser?.role === 'admin' || (currentUser?.role === 'moderator' && comment.role !== 'moderator')) && (
                <button
                  onClick={() => handleBanUser(comment.username, comment.user_id, false)}
                  className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 transition"
                >
                  Ban
                </button>
              )}
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 transition"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <p className="text-gray-800">{comment.content}</p>

        {replyTo === comment.id ? (
          <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="mt-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={2}
              placeholder="Write a reply..."
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setReplyTo(comment.id)}
            className="text-blue-600 text-sm mt-2 hover:underline"
          >
            Reply
          </button>
        )}
      </div>

      {comment.replies?.map(reply => renderComment(reply, depth + 1))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/forum" className="text-blue-600 hover:underline">
            Back to Forum
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Post */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <RoleBadge role={post.role} />
              <span className="font-medium">{post.username}</span>
              <span className="text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            {isMod && (
              <button
                onClick={handleDeletePost}
                className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition flex-shrink-0"
              >
                Delete Post
              </button>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="w-full max-h-96 object-cover rounded-lg mb-4"
            />
          )}

          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            Comments ({comments.length})
          </h2>

          {/* New Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Write a comment..."
            />
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Post Comment
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
