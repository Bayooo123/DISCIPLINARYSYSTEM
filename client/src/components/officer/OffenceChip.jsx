import React from 'react';

const TIER_STYLES = {
  EXPULSION:      'bg-red-100 text-red-800 border-red-200',
  RUSTICATION_4:  'bg-orange-100 text-orange-800 border-orange-200',
  RUSTICATION_2:  'bg-amber-100 text-amber-800 border-amber-200',
  RUSTICATION_1:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  WARNING:        'bg-blue-100 text-blue-800 border-blue-200',
  PANEL_DECISION: 'bg-gray-100 text-gray-700 border-gray-200',
};

const TIER_LABELS = {
  EXPULSION:      'Expulsion',
  RUSTICATION_4:  '4-Sem Rustication',
  RUSTICATION_2:  '2-Sem Rustication',
  RUSTICATION_1:  '1-Sem Rustication',
  WARNING:        'Warning',
  PANEL_DECISION: 'Panel Decision',
};

export default function OffenceChip({ name, penaltyTier, onRemove }) {
  const tierStyle = TIER_STYLES[penaltyTier] || TIER_STYLES.PANEL_DECISION;
  return (
    <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{name}</p>
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${tierStyle}`}>
          {TIER_LABELS[penaltyTier] || penaltyTier}
        </span>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-red-600 transition-colors flex-shrink-0 ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
