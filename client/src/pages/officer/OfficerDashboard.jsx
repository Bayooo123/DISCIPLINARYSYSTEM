import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import OfficerLayout from '../../components/ui/OfficerLayout';
import StatCard from '../../components/ui/StatCard';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';

const STATUS_BADGE = {
  AWAITING_RESPONSE: { label: 'Awaiting Response', cls: 'bg-amber-100 text-amber-800' },
  RESPONSE_RECEIVED: { label: 'Response In',        cls: 'bg-blue-100 text-blue-800' },
  PANEL_CONSTITUTED: { label: 'Panel Set',           cls: 'bg-purple-100 text-purple-800' },
  HEARING_SCHEDULED: { label: 'Hearing Scheduled',   cls: 'bg-indigo-100 text-indigo-800' },
  HEARING_COMPLETE:  { label: 'Heard',               cls: 'bg-teal-100 text-teal-800' },
  VERDICT_DELIVERED: { label: 'Verdict',             cls: 'bg-green-100 text-green-800' },
  CLOSED:            { label: 'Closed',              cls: 'bg-gray-100 text-gray-600' },
  COMPLAINT_FILED:   { label: 'Filed',               cls: 'bg-orange-100 text-orange-800' },
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cases/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <OfficerLayout title="My Dashboard">
      {/* Welcome */}
      <div className="bg-white border border-border rounded-xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-maroon flex items-center justify-center flex-shrink-0">
          <span className="text-gold font-serif font-bold text-lg">⚖</span>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-serif font-bold text-ink">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-xs text-muted">Complaints Officer — {user?.department || 'Student Affairs'}</p>
        </div>
        <Link
          to="/officer/cases/new"
          className="bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors"
        >
          + File Complaint
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cases Filed"       value={data?.total}           accent="maroon" />
        <StatCard label="Awaiting Response"        value={data?.pendingResponse} accent="amber" />
        <StatCard label="Hearing Scheduled"        value={data?.hearingScheduled} accent="blue" />
        <StatCard label="Resolved This Year"       value={data?.resolvedThisYear} accent="gold" />
      </div>

      {/* Recent cases */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Recent Cases</h3>
          <Link to="/officer/cases" className="text-xs text-maroon hover:underline">View all →</Link>
        </div>

        {!data?.recentCases?.length ? (
          <p className="text-sm text-muted py-8 text-center">No cases filed yet.</p>
        ) : (
          <div className="space-y-3">
            {data.recentCases.map(c => {
              const badge = STATUS_BADGE[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-600' };
              const offence = c.offences?.[0]?.offenceType;
              return (
                <Link
                  key={c.id}
                  to={`/officer/cases/${c.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-cream transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">
                        {c.student?.firstName} {c.student?.lastName}
                      </span>
                      <span className="text-xs text-muted">{c.student?.matricNumber}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {offence?.name || 'Unknown offence'}
                      {c.offences?.length > 1 && ` +${c.offences.length - 1} more`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-muted group-hover:text-maroon">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </OfficerLayout>
  );
}
