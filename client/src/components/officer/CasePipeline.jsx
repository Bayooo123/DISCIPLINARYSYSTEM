import React from 'react';

const STAGES = [
  { key: 'COMPLAINT_FILED',   label: 'Filed' },
  { key: 'STUDENT_NOTIFIED',  label: 'Notified' },
  { key: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
  { key: 'RESPONSE_RECEIVED', label: 'Response In' },
  { key: 'PANEL_CONSTITUTED', label: 'Panel Set' },
  { key: 'HEARING_SCHEDULED', label: 'Hearing Scheduled' },
  { key: 'HEARING_COMPLETE',  label: 'Heard' },
  { key: 'VERDICT_DELIVERED', label: 'Verdict' },
  { key: 'CLOSED',            label: 'Closed' },
];

const CLOSED_STATUSES = ['CLOSED', 'ESCALATED', 'VERDICT_DELIVERED'];

export default function CasePipeline({ status }) {
  const currentIdx = STAGES.findIndex(s => s.key === status);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max py-2">
        {STAGES.map((stage, i) => {
          const isDone    = currentIdx > i;
          const isCurrent = currentIdx === i;
          const isLast    = i === STAGES.length - 1;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${isDone    ? 'bg-maroon border-maroon text-white'
                  : isCurrent ? 'bg-white border-maroon text-maroon'
                  :             'bg-white border-border text-muted'}`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap text-center leading-tight
                  ${isCurrent ? 'text-maroon font-semibold' : isDone ? 'text-ink' : 'text-muted'}`}>
                  {stage.label}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-1 min-w-[20px] transition-colors ${isDone ? 'bg-maroon' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
