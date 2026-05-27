import React, { useState } from 'react';
import OffenceChip from './OffenceChip';

const CATEGORY_LABELS = {
  EXAMINATION:    'Examination',
  DRUG_RELATED:   'Drug-Related',
  SOCIAL_CONDUCT: 'Social Conduct',
  HOSTEL:         'Hostel',
  GENERAL:        'General',
};

export default function OffenceSelector({ offenceTypes, selected, onChange }) {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');

  const categories = [...new Set(offenceTypes.map(o => o.category))];

  const filtered = offenceTypes.filter(o => {
    const matchesCat = !category || o.category === category;
    const matchesText = !filter || o.name.toLowerCase().includes(filter.toLowerCase());
    return matchesCat && matchesText;
  });

  function toggle(offence) {
    const exists = selected.find(s => s.id === offence.id);
    onChange(exists ? selected.filter(s => s.id !== offence.id) : [...selected, offence]);
  }

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search offences…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-muted text-center">No offences match your search.</p>
        )}
        {filtered.map(o => {
          const isSelected = selected.some(s => s.id === o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors
                ${isSelected ? 'bg-maroon/5' : 'hover:bg-cream'}`}
            >
              <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center
                ${isSelected ? 'bg-maroon border-maroon' : 'border-border'}`}>
                {isSelected && <span className="text-white text-xs">✓</span>}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-ink block">{o.name}</span>
                <span className="text-xs text-muted">{CATEGORY_LABELS[o.category] || o.category}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">Selected ({selected.length}):</p>
          {selected.map(o => (
            <OffenceChip
              key={o.id}
              name={o.name}
              penaltyTier={o.penaltyTier}
              onRemove={() => toggle(o)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
