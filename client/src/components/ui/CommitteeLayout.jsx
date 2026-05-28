import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

const COMMITTEE_NAV = [
  { type: 'section', label: 'Overview' },
  { icon: '📊', label: 'Dashboard',  to: '/committee/dashboard', end: true },
  { type: 'section', label: 'Cases' },
  { icon: '📁', label: 'All Cases',   to: '/committee/cases', end: true },
  { icon: '🗓️', label: 'Hearings',    to: '/committee/hearings', end: true },
  { type: 'section', label: 'Reports' },
  { icon: '📈', label: 'Analytics',   to: '/committee/analytics', end: true },
];

const PANEL_NAV = [
  { type: 'section', label: 'Overview' },
  { icon: '📊', label: 'Dashboard', to: '/panel/dashboard', end: true },
  { type: 'section', label: 'Cases' },
  { icon: '📁', label: 'My Cases',  to: '/panel/cases', end: true },
];

export default function CommitteeLayout({ children, title }) {
  const { user } = useAuth();
  const navItems = user?.role === 'PANEL_MEMBER' ? PANEL_NAV : COMMITTEE_NAV;
  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">
      <Sidebar navItems={navItems} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
