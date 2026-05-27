import React from 'react';
import { formatDateTime } from '../../utils/formatters';

const ACTION_ICONS = {
  COMPLAINT_FILED:          '📝',
  STUDENT_NOTIFIED_EMAIL:   '📧',
  OFFICER_CONFIRMATION_EMAIL: '📨',
  STUDENT_RESPONSE_RECEIVED: '💬',
  PANEL_CONSTITUTED:        '⚖️',
  HEARING_SCHEDULED:        '📅',
  HEARING_COMPLETE:         '✅',
  VERDICT_DELIVERED:        '🏛️',
  CASE_CLOSED:              '🔒',
};

export default function CaseTimeline({ auditLogs }) {
  if (!auditLogs?.length) return <p className="text-sm text-muted">No activity recorded yet.</p>;

  return (
    <div className="space-y-4">
      {auditLogs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-cream border border-border flex items-center justify-center text-sm flex-shrink-0">
              {ACTION_ICONS[log.action] || '•'}
            </div>
            {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm text-ink">{log.description}</p>
            <p className="text-xs text-muted mt-0.5">{formatDateTime(log.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
