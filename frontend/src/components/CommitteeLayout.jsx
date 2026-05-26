import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { icon: '📋', label: 'Cases',      to: '/committee' },
  { icon: '👥', label: 'Invite User', to: '/committee/invite' },
];

export default function CommitteeLayout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(to) {
    if (to === '/committee') return location.pathname === '/committee';
    return location.pathname.startsWith(to);
  }

  const roleLabel = {
    committee_member: 'Committee Member',
    platform_admin:   'Platform Administrator',
  }[user?.role] || user?.role;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 font-sans">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-60 bg-brand flex-shrink-0 flex flex-col select-none">

        {/* Branding */}
        <div className="px-5 pt-6 pb-5 border-b border-brand-600">
          <div className="w-11 h-11 bg-gold rounded-full flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg font-serif">⚖</span>
          </div>
          <p className="text-gold text-xs font-semibold tracking-widest uppercase leading-none">
            {user?.institutionName || 'TIDDS'}
          </p>
          <p className="text-white text-xs mt-1 opacity-75">Disciplinary Committee</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-600 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-brand-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold font-serif">
                {user?.fullName?.charAt(0) || 'C'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{user?.fullName}</p>
              <p className="text-brand-200 text-xs opacity-75 leading-tight">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-brand-200 hover:text-white transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-stone-900 font-serif">
              {title || 'Disciplinary Committee'}
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <p className="text-xs text-stone-500 hidden sm:block">
            Welcome, <span className="font-medium text-stone-700">{user?.fullName?.split(' ')[0]}</span>
          </p>
        </header>

        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
