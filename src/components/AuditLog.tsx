'use client';

import { useState, useEffect } from 'react';

interface AuditEntry {
  id: number;
  username: string | null;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      } else {
        setError('Failed to load audit logs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading audit log...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'text-blue-600';
    if (action.includes('POST')) return 'text-green-600';
    if (action.includes('DELETE')) return 'text-red-600';
    if (action.includes('BLOCKED') || action.includes('LOCKED')) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-sm text-gray-600 mb-4">
        All user actions are logged for security monitoring.
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Details</th>
              <th className="px-4 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 50).map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-medium">
                  {log.username || 'Anonymous'}
                </td>
                <td className={`px-4 py-2 font-semibold ${getActionColor(log.action)}`}>
                  {log.action}
                </td>
                <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                  {log.details}
                </td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                  {log.ip_address}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {logs.length === 0 && (
        <p className="text-center text-gray-500 py-8">No audit entries yet.</p>
      )}
    </div>
  );
}
