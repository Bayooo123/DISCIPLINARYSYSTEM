import React from 'react';
import { LICENCE_COLOURS, LEVEL_COLOURS, ROLE_COLOURS } from '../../utils/constants';
import { roleLabel } from '../../utils/formatters';

export function LicenceBadge({ status }) {
  const cls = LICENCE_COLOURS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function LevelBadge({ level }) {
  const cls = LEVEL_COLOURS[level] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

export function RoleBadge({ role }) {
  const cls = ROLE_COLOURS[role] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {roleLabel(role)}
    </span>
  );
}

export function StatusBadge({ active, pendingInvite }) {
  if (pendingInvite) {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending</span>;
  }
  return active
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactive</span>;
}
