import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../utils/formatters';

export default function Hearings() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: 'HEARING_SCHEDULED', limit: 100 });
    api.get(`/committee/cases?${params}`)
      .then(r => setCases(r.cases || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = cases.filter(c => c.hearingDate && new Date(c.hearingDate) >= now)
    .sort((a, b) => new Date(a.hearingDate) - new Date(b.hearingDate));
  const past = cases.filter(c => c.hearingDate && new Date(c.hearingDate) < now)
    .sort((a, b) => new Date(b.hearingDate) - new Date(a.hearingDate));

  const displayed = filter === 'upcoming' ? upcoming : past;

  // Group by date
  const grouped = {};
  for (const c of displayed) {
    const dateKey = c.hearingDate ? new Date(c.hearingDate).toDateString() : 'Unscheduled';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(c);
  }

  return (
    <CommitteeLayout title="Hearings">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm text-gray-500">{displayed.length} hearing{displayed.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {['upcoming', 'past'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-maroon text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <FullPageSpinner /> : displayed.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No {filter} hearings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {dateKey === 'Unscheduled' ? 'Date TBD' : formatDate(new Date(dateKey))}
              </p>
              <div className="space-y-3">
                {items.map(c => (
                  <HearingCard key={c.id} c={c} navigate={navigate} past={filter === 'past'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </CommitteeLayout>
  );
}

function HearingCard({ c, navigate, past }) {
  const daysUntil = c.hearingDate
    ? Math.ceil((new Date(c.hearingDate) - new Date()) / 86400000)
    : null;

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={() => navigate(`/committee/cases/${c.id}`)}
    >
      {/* Date badge */}
      <div className={`flex-shrink-0 rounded-xl text-center px-3 py-2 min-w-[52px] ${past ? 'bg-gray-100' : 'bg-maroon'}`}>
        <p className={`text-sm font-bold ${past ? 'text-gray-500' : 'text-white'}`}>
          {c.hearingDate ? new Date(c.hearingDate).toLocaleDateString('en-GB', { day: 'numeric' }) : '?'}
        </p>
        <p className={`text-xs ${past ? 'text-gray-400' : 'text-gold-bright'}`}>
          {c.hearingDate ? new Date(c.hearingDate).toLocaleDateString('en-GB', { month: 'short' }) : ''}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-medium text-gray-900 text-sm">{c.referenceNumber}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {c.student?.firstName} {c.student?.lastName} · {c.student?.matricNumber}
            </p>
          </div>
          {!past && daysUntil !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              daysUntil <= 1 ? 'bg-red-100 text-red-700' :
              daysUntil <= 3 ? 'bg-amber-100 text-amber-700' :
              'bg-teal-100 text-teal-700'
            }`}>
              {daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d away`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {c.hearingTime && (
            <p className="text-xs text-gray-400">🕐 {c.hearingTime}</p>
          )}
          {c.hearingVenue && (
            <p className="text-xs text-gray-400">📍 {c.hearingVenue}</p>
          )}
          {c.panel?.name && (
            <p className="text-xs text-gray-400">👥 {c.panel.name}</p>
          )}
        </div>
        {c.offences?.length > 0 && (
          <p className="text-xs text-gray-400 mt-1.5 truncate">
            {c.offences.slice(0, 2).map(o => o.offenceType?.name).join(', ')}
            {c.offences.length > 2 ? ` +${c.offences.length - 2} more` : ''}
          </p>
        )}
      </div>

      <span className="text-xs font-medium text-maroon flex-shrink-0">View →</span>
    </div>
  );
}
