import React from 'react';

const accents = {
  maroon: 'border-maroon bg-maroon-50',
  gold:   'border-gold bg-gold-50',
  green:  'border-green-600 bg-green-50',
  blue:   'border-blue-600 bg-blue-50',
  amber:  'border-amber-600 bg-amber-50',
};

export default function StatCard({ label, value, subtext, accent = 'maroon' }) {
  return (
    <div className={`rounded-xl border-t-4 p-5 bg-white shadow-sm ${accents[accent]}`}>
      <p className="text-3xl font-serif font-bold text-ink">{value ?? '—'}</p>
      <p className="text-sm font-medium text-ink mt-1">{label}</p>
      {subtext && <p className="text-xs text-muted mt-0.5">{subtext}</p>}
    </div>
  );
}
