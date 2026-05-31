'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoleBadge from '@/components/RoleBadge';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_locked: boolean;
  created_at: string;
}

interface CurrentUser {
  id: number;
  username: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/users'),
      ]);
      if (!meRes.ok) { router.push('/login'); return; }
      const me = (await meRes.json()).user;
      if (me.role !== 'admin') { router.push('/forum'); return; }
      setCurrentUser(me);
      if (usersRes.ok) setUsers((await usersRes.json()).users);
    } catch (err) {
      console.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (user: User) => {
    const action = user.is_locked ? 'unban' : 'ban';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${user.username}"?`)) return;
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !user.is_locked }),
      });
      if (res.ok) { await loadAll(); router.refresh(); }
      else alert(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetRole = async (user: User, newRole: string) => {
    if (!confirm(`Set "${user.username}" role to ${newRole}?`)) return;
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) { await loadAll(); router.refresh(); }
      else alert('Failed to set role');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">User management</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/audit" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition text-sm">
              Audit Log
            </Link>
            <Link href="/forum" className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 transition text-sm">
              Back to Forum
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm" style={{color: '#111'}}>
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-gray-600">Joined</th>
                <th className="px-4 py-3 text-left text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    {u.is_locked
                      ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Banned</span>
                      : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id ? (
                      <span className="text-xs text-gray-400">You</span>
                    ) : u.role === 'admin' ? (
                      <span className="text-xs text-gray-400">Admin</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBan(u)}
                          disabled={actionLoading === u.id}
                          className={`px-2 py-1 text-xs rounded transition ${
                            u.is_locked
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {actionLoading === u.id ? '...' : u.is_locked ? 'Unban' : 'Ban'}
                        </button>
                        {u.role === 'user' && (
                          <button
                            onClick={() => handleSetRole(u, 'moderator')}
                            disabled={actionLoading === u.id}
                            className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                          >
                            Make Mod
                          </button>
                        )}
                        {u.role === 'moderator' && (
                          <button
                            onClick={() => handleSetRole(u, 'user')}
                            disabled={actionLoading === u.id}
                            className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            Remove Mod
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
