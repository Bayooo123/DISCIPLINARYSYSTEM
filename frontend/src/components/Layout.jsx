import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  student: 'Student Portal',
  complaints_officer: 'Complaints Officer',
  committee_member: 'Disciplinary Committee',
  panel_member: 'Panel Member',
  platform_admin: 'Platform Administrator',
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-brand text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-widest">
              {user?.institutionName || 'TIDDS'}
            </p>
            <h1 className="text-sm font-semibold leading-tight">
              Digital Disciplinary System
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-blue-200">
              {user?.fullName} — {roleLabels[user?.role]}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs bg-white text-brand px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {title && (
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{title}</h2>
        )}
        {children}
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        TIDDS v1.0 — Confidential
      </footer>
    </div>
  );
}
