export const ROLES = {
  PLATFORM_ADMIN:    'PLATFORM_ADMIN',
  INSTITUTION_ADMIN: 'INSTITUTION_ADMIN',
  COMMITTEE_MEMBER:  'COMMITTEE_MEMBER',
  PANEL_MEMBER:      'PANEL_MEMBER',
  COMPLAINTS_OFFICER:'COMPLAINTS_OFFICER',
  STUDENT:           'STUDENT',
};

export const LICENCE_STATUSES = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];

export const OFFENCE_CATEGORIES = ['Academic', 'Conduct', 'Hostel', 'General'];

export const LOG_LEVELS    = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
export const LOG_CATEGORIES = ['EMAIL', 'SMS', 'INTEGRATION', 'SYSTEM', 'AUTHENTICATION'];

export const ROLE_COLOURS = {
  PLATFORM_ADMIN:    'bg-maroon-900 text-maroon-100',
  INSTITUTION_ADMIN: 'bg-maroon-700 text-white',
  COMMITTEE_MEMBER:  'bg-gold-100 text-gold-800',
  PANEL_MEMBER:      'bg-blue-100 text-blue-800',
  COMPLAINTS_OFFICER:'bg-amber-100 text-amber-800',
  STUDENT:           'bg-gray-100 text-gray-700',
};

export const LEVEL_COLOURS = {
  INFO:     'bg-blue-100 text-blue-800',
  WARNING:  'bg-amber-100 text-amber-800',
  ERROR:    'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-900 text-red-100',
};

export const LICENCE_COLOURS = {
  ACTIVE:    'bg-green-100 text-green-800',
  TRIAL:     'bg-blue-100 text-blue-800',
  SUSPENDED: 'bg-amber-100 text-amber-800',
  EXPIRED:   'bg-red-100 text-red-800',
};
