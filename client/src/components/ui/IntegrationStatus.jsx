import React from 'react';

export default function IntegrationStatus({ label, connected, detail }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
        {connected
          ? <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        }
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
        {!detail && <p className={`text-xs ${connected ? 'text-green-700' : 'text-gray-500'}`}>
          {connected ? 'Connected' : 'Not configured'}
        </p>}
      </div>
    </div>
  );
}
