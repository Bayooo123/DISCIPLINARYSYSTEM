export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', ...opts,
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export function roleLabel(role) {
  const map = {
    PLATFORM_ADMIN:   'Platform Administrator',
    INSTITUTION_ADMIN:'Institution Admin',
    COMMITTEE_MEMBER: 'Committee Member',
    PANEL_MEMBER:     'Panel Member',
    COMPLAINTS_OFFICER: 'Complaints Officer',
    STUDENT:          'Student',
  };
  return map[role] || role;
}

export function initials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}
