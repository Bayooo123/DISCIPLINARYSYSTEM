import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const OFFICER_NAV = [
  { type: 'section', label: 'Overview' },
  { icon: '📊', label: 'Dashboard',     to: '/officer/dashboard', end: true },
  { type: 'section', label: 'Cases' },
  { icon: '📝', label: 'File Complaint', to: '/officer/cases/new' },
  { icon: '📁', label: 'My Cases',       to: '/officer/cases', end: true },
  { type: 'section', label: 'Account' },
  { icon: '⚙️', label: 'Profile',        to: '/officer/profile' },
];

export default function OfficerLayout({ children, title }) {
  return (
    <div className="flex h-screen overflow-hidden bg-cream font-sans">
      <Sidebar navItems={OFFICER_NAV} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
