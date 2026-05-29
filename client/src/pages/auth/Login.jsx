import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'PLATFORM_ADMIN')    navigate('/admin/dashboard');
      else if (user.role === 'INSTITUTION_ADMIN') navigate('/institution/dashboard');
      else navigate('/login');
    } catch (err) {
      setError(err.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header bar */}
          <div className="bg-maroon px-8 py-7 text-center">
            <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-serif font-bold text-2xl">⚖</span>
            </div>
            <h1 className="text-gold font-serif font-bold text-2xl leading-tight">CANDOR</h1>
            <p className="text-white/70 text-xs mt-1 leading-snug">
              Institutional Misconduct,<br />Handled with Precision
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">
            <div>
              <h2 className="text-lg font-serif font-semibold text-ink mb-1">Sign in</h2>
              <p className="text-xs text-muted">Enter your credentials to access the platform</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@institution.edu.ng"
              required
              autoFocus
            />

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-ink pr-10 focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  tabIndex="-1"
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Powered by <span className="font-medium text-ink">Reforma Digital Solutions Ltd</span>
        </p>
      </div>
    </div>
  );
}
