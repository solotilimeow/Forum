'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditEntry {
  id: number;
  username: string | null;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

interface CurrentUser {
  id: number;
  username: string;
  role: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: '#4ade80',
  LOGOUT: '#94a3b8',
  LOGIN_BLOCKED: '#fb923c',
  CREATE_POST: '#60a5fa',
  DELETE_POST: '#f87171',
  CREATE_COMMENT: '#a78bfa',
  DELETE_COMMENT: '#f87171',
  BAN_USER: '#f87171',
  UNBAN_USER: '#4ade80',
  SET_ROLE: '#facc15',
  SUSPICIOUS_IP_CHANGE: '#f97316',
};

export default function AuditPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [meRes, logsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/audit'),
      ]);
      if (!meRes.ok) { router.push('/login'); return; }
      const me = (await meRes.json()).user;
      if (me.role !== 'admin' && me.role !== 'moderator') { router.push('/forum'); return; }
      setCurrentUser(me);
      if (logsRes.ok) setLogs((await logsRes.json()).logs);
    } catch (err) {
      console.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter
    ? logs.filter(l =>
        l.action.toLowerCase().includes(filter.toLowerCase()) ||
        (l.username ?? '').toLowerCase().includes(filter.toLowerCase()) ||
        l.details.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Audit Log</h1>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {logs.length} entries — all moderation and user actions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser?.role === 'admin' && (
              <Link href="/admin" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-semibold">
                Admin Panel
              </Link>
            )}
            <Link href="/forum" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
              Back to Forum
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by user, action, or details..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded text-sm"
          />
        </div>

        <div className="rounded-lg overflow-hidden shadow-md" style={{ background: '#1a1a2e', border: '1px solid #2d2d4a' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#252542' }}>
              <tr>
                <th className="px-4 py-3 text-left" style={{ color: '#9ca3af' }}>Time</th>
                <th className="px-4 py-3 text-left" style={{ color: '#9ca3af' }}>User</th>
                <th className="px-4 py-3 text-left" style={{ color: '#9ca3af' }}>Action</th>
                <th className="px-4 py-3 text-left" style={{ color: '#9ca3af' }}>Details</th>
                <th className="px-4 py-3 text-left" style={{ color: '#9ca3af' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid #2d2d4a',
                    background: i % 2 === 0 ? '#1a1a2e' : '#1e1e35',
                  }}
                >
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-semibold" style={{ color: '#e8e8f0' }}>
                    {log.username ?? <span style={{ color: '#6b7280' }}>—</span>}
                  </td>
                  <td className="px-4 py-2 font-semibold" style={{ color: ACTION_COLORS[log.action] ?? '#e8e8f0' }}>
                    {log.action}
                  </td>
                  <td className="px-4 py-2" style={{ color: '#9ca3af', maxWidth: '320px' }}>
                    <span className="truncate block">{log.details}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: '#6b7280' }}>
                    {log.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className="text-center py-10" style={{ color: '#6b7280' }}>No entries found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
