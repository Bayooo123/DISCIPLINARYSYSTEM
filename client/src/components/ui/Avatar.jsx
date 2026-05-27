import React from 'react';
import { initials } from '../../utils/formatters';

const roleColours = {
  PLATFORM_ADMIN:    'bg-maroon-900 text-maroon-100',
  INSTITUTION_ADMIN: 'bg-maroon-700 text-white',
  COMMITTEE_MEMBER:  'bg-gold-200 text-gold-900',
  PANEL_MEMBER:      'bg-blue-200 text-blue-900',
  COMPLAINTS_OFFICER:'bg-amber-200 text-amber-900',
  STUDENT:           'bg-gray-200 text-gray-700',
};

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export default function Avatar({ firstName, lastName, role, size = 'md' }) {
  const cls = roleColours[role] || 'bg-gray-200 text-gray-700';
  return (
    <div className={`rounded-full flex items-center justify-center font-semibold ${sizes[size]} ${cls}`}>
      {initials(firstName, lastName)}
    </div>
  );
}
