import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const REFORMA_NAV = [
  { type: 'section', label: 'Overview' },
  { icon: '📊', label: 'Dashboard',        to: '/admin/dashboard', end: true },
  { type: 'section', label: 'Institutions' },
  { icon: '🏛️', label: 'All Institutions', to: '/admin/institutions', end: true },
  { icon: '➕', label: 'Add Institution',  to: '/admin/institutions/new' },
  { type: 'section', label: 'System' },
  { icon: '📋', label: 'System Logs',      to: '/admin/logs' },
  { icon: '⚙️', label: 'Settings',         to: '/admin/settings' },
];

const INSTITUTION_NAV = [
  { type: 'section', label: 'Overview' },
  { icon: '📊', label: 'Dashboard',     to: '/institution/dashboard', end: true },
  { type: 'section', label: 'Users' },
  { icon: '👥', label: 'All Users',     to: '/institution/users', end: true },
  { icon: '✉️', label: 'Invite User',   to: '/institution/users/invite' },
  { type: 'section', label: 'Configuration' },
  { icon: '⚖️', label: 'Offence Types', to: '/institution/offence-types' },
  { icon: '🏛️', label: 'Settings',      to: '/institution/settings' },
  { type: 'section', label: 'System' },
  { icon: '📋', label: 'System Logs',   to: '/institution/logs' },
];

export default function AdminLayout({ children, title, isInstitution = false }) {
  const nav = isInstitution ? INSTITUTION_NAV : REFORMA_NAV;
  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">
      <Sidebar navItems={nav} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
