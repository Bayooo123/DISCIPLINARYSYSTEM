import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function AcceptInvitation() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token') || '';
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8)  return setError('Password must be at least 8 characters');
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/accept-invite', { token, password });
      localStorage.setItem('candor_token', data.token);
      localStorage.setItem('candor_user',  JSON.stringify(data.user));
      setSuccess(true);
      setTimeout(() => {
        const role = data.user.role;
        navigate(role === 'PLATFORM_ADMIN' ? '/admin/dashboard' : '/institution/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.error || 'This invitation link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-maroon px-8 py-6 text-center">
          <h1 className="text-gold font-serif font-bold text-xl">Activate Your Account</h1>
          <p className="text-white/70 text-xs mt-1">CANDOR — Reforma Digital Solutions</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">
          {success
            ? <Alert type="success">Account activated! Redirecting…</Alert>
            : error
              ? <Alert type="error">{error}</Alert>
              : null
          }
          <div>
            <label className="block text-sm font-medium text-ink mb-1">New password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={8}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-ink pr-10 focus:outline-none focus:ring-2 focus:ring-maroon"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex="-1"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-maroon"
            />
          </div>
          <Button type="submit" fullWidth loading={loading} disabled={success}>
            Activate Account
          </Button>
        </form>
      </div>
    </div>
  );
}
