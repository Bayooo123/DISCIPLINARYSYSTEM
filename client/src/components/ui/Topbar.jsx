import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ title }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-border h-14 flex items-center justify-between px-6">
      <h1 className="text-base font-serif font-semibold text-ink">{title}</h1>
      {user && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted hidden sm:block">
            {user.firstName} {user.lastName}
          </p>
          {user.role === 'PLATFORM_ADMIN' && (
            <span className="bg-maroon text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Reforma Admin
            </span>
          )}
        </div>
      )}
    </header>
  );
}
