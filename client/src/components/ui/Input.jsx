import React from 'react';

export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-ink mb-1">{label}</label>}
      <input
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-ink placeholder:text-muted
          focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon
          ${error ? 'border-red-400 bg-red-50' : 'border-border bg-white'}
          ${className}
        `}
      />
      {hint  && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-ink mb-1">{label}</label>}
      <textarea
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-ink placeholder:text-muted
          focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon resize-none
          ${error ? 'border-red-400 bg-red-50' : 'border-border bg-white'}
          ${className}
        `}
      />
      {hint  && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-ink mb-1">{label}</label>}
      <select
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2.5 text-sm text-ink
          focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon
          ${error ? 'border-red-400 bg-red-50' : 'border-border bg-white'}
          ${className}
        `}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
