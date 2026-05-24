import React from 'react';

const STAGE_LABELS = {
  complaint_filed: 'Complaint Filed',
  student_notified: 'Student Notified',
  awaiting_response: 'Awaiting Response',
  response_received: 'Response Received',
  response_overdue: 'Response Overdue',
  panel_constituted: 'Panel Constituted',
  appearance_noticed: 'Appearance Noticed',
  hearing_scheduled: 'Hearing Scheduled',
  hearing_completed: 'Hearing Completed',
  verdict_recorded: 'Verdict Recorded',
  closed: 'Closed',
};

const STAGE_COLOURS = {
  complaint_filed: 'bg-yellow-100 text-yellow-800',
  student_notified: 'bg-blue-100 text-blue-800',
  awaiting_response: 'bg-orange-100 text-orange-800',
  response_received: 'bg-green-100 text-green-800',
  response_overdue: 'bg-red-100 text-red-800',
  panel_constituted: 'bg-purple-100 text-purple-800',
  appearance_noticed: 'bg-indigo-100 text-indigo-800',
  hearing_scheduled: 'bg-indigo-100 text-indigo-800',
  hearing_completed: 'bg-teal-100 text-teal-800',
  verdict_recorded: 'bg-gray-200 text-gray-700',
  closed: 'bg-gray-100 text-gray-500',
};

export default function StageBadge({ stage }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLOURS[stage] || 'bg-gray-100 text-gray-600'}`}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}
