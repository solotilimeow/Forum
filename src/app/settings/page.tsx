'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CurrentUser {
  id: number;
  username: string;
  role: string;
  totp_enabled: boolean;
}

type Step = 'idle' | 'setup' | 'disable';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const [meRes, userRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/settings/2fa/status'),
      ]);
      if (!meRes.ok) { router.push('/login'); return; }
      const me = (await meRes.json()).user;
      const status = userRes.ok ? (await userRes.json()) : { totp_enabled: false };
      setUser({ ...me, totp_enabled: status.totp_enabled });
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setError(''); setSuccess(''); setActionLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch {
      setError('Failed to start 2FA setup');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setActionLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess('2FA enabled successfully!');
      setStep('idle');
      setCode('');
      await loadUser();
    } catch {
      setError('Failed to verify code');
    } finally {
      setActionLoading(false);
    }
  };

  const startDisable = () => {
    setStep('disable'); setError(''); setSuccess(''); setCode('');
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setActionLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess('2FA disabled.');
      setStep('idle');
      setCode('');
      await loadUser();
    } catch {
      setError('Failed to disable 2FA');
    } finally {
      setActionLoading(false);
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
    <div className="min-h-screen" style={{ background: '#0f0f1a' }}>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: '#f3f4f6' }}>Account Settings</h1>
          <Link href="/forum" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
            Back to Forum
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-xl p-6" style={{ background: '#1a1a2e', border: '1px solid #2d2d4a' }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#f3f4f6' }}>Two-Factor Authentication</h2>
          <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>
            Protect your account with a TOTP authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Status:</span>
            {user?.totp_enabled
              ? <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>Enabled</span>
              : <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Disabled</span>
            }
          </div>

          {success && (
            <div className="mb-4 px-4 py-3 rounded text-sm" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-3 rounded text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {step === 'idle' && (
            !user?.totp_enabled
              ? <button onClick={startSetup} disabled={actionLoading} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm">
                  {actionLoading ? 'Setting up...' : 'Enable 2FA'}
                </button>
              : <button onClick={startDisable} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                  Disable 2FA
                </button>
          )}

          {step === 'setup' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                1. Scan this QR code with your authenticator app, or enter the secret manually.
              </p>
              {qrDataUrl && (
                <div className="flex justify-center">
                  <img src={qrDataUrl} alt="QR Code" className="rounded-lg" style={{ width: 200, height: 200, background: '#fff', padding: 8 }} />
                </div>
              )}
              <div className="rounded p-3 text-center font-mono text-xs" style={{ background: '#252542', color: '#c084fc', wordBreak: 'break-all' }}>
                {secret}
              </div>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                2. Enter the 6-digit code from your app to confirm.
              </p>
              <form onSubmit={confirmSetup} className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-2 rounded text-center text-lg tracking-widest"
                  autoFocus
                  required
                />
                <button type="submit" disabled={actionLoading || code.length !== 6} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm disabled:opacity-50">
                  {actionLoading ? '...' : 'Confirm'}
                </button>
                <button type="button" onClick={() => { setStep('idle'); setCode(''); setError(''); }} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                  Cancel
                </button>
              </form>
            </div>
          )}

          {step === 'disable' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Enter your current 6-digit authenticator code to disable 2FA.
              </p>
              <form onSubmit={confirmDisable} className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-2 rounded text-center text-lg tracking-widest"
                  autoFocus
                  required
                />
                <button type="submit" disabled={actionLoading || code.length !== 6} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm disabled:opacity-50">
                  {actionLoading ? '...' : 'Disable'}
                </button>
                <button type="button" onClick={() => { setStep('idle'); setCode(''); setError(''); }} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
