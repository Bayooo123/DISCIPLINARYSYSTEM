import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/formatters';

export default function Sidebar({ navItems, sectionLabels = {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#3D0A0A] flex flex-col h-screen sticky top-0">
      {/* Branding */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gold rounded-lg flex items-center justify-center">
            <span className="text-white font-serif font-bold text-lg">⚖</span>
          </div>
          <div>
            <p className="text-white font-serif font-bold text-base leading-tight">CANDOR</p>
            <p className="text-white/40 text-xs">Disciplinary Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map((item) => {
          if (item.type === 'section') {
            return (
              <p key={item.label} className="px-3 pt-4 pb-1 text-xs font-semibold text-white/30 uppercase tracking-widest">
                {item.label}
              </p>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-gold/10 text-gold border-l-2 border-gold pl-[10px]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-xs font-bold">
                {initials(user.firstName, user.lastName)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Sign out →
          </button>
        </div>
      )}
    </aside>
  );
}
