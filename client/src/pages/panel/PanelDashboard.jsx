import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  PANEL_CONSTITUTED: { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED: { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:  { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED: { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:            { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:         { label: 'Escalated',            cls: 'bg-red-100 text-red-800' },
};

const PANEL_ROLE_CLS = {
  CHAIRPERSON: 'bg-maroon text-white',
  SECRETARY: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

export default function PanelDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/panel/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CommitteeLayout title="Panel Dashboard"><FullPageSpinner /></CommitteeLayout>;

  const stats = data?.stats || {};

  return (
    <CommitteeLayout title="Panel Dashboard">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-lg font-serif font-bold text-gray-900">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Your assigned disciplinary panel cases</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Assigned Cases"   value={stats.assignedCases || 0}   colour="maroon" />
        <StatCard label="Upcoming Hearings" value={stats.upcomingHearings || 0} colour="teal" />
        <StatCard label="Awaiting Action"   value={stats.awaitingAction || 0}   colour="amber" />
      </div>

      {/* Awaiting action alert */}
      {stats.awaitingAction > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-amber-500 text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Action Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {stats.awaitingAction} case{stats.awaitingAction !== 1 ? 's' : ''} require your attention.
              {' '}<button onClick={() => navigate('/panel/cases')} className="underline hover:no-underline">View Cases →</button>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming hearings */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Upcoming Hearings</p>
          {!data?.upcomingHearings?.length ? (
            <p className="text-sm text-gray-400">No upcoming hearings.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingHearings.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg"
                  onClick={() => navigate(`/panel/cases/${h.caseId}`)}
                >
                  <div className="bg-maroon text-center rounded-lg px-2 py-1 min-w-[44px]">
                    <div className="text-xs font-bold text-gold-bright">
                      {new Date(h.hearingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{h.referenceNumber} · {h.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {h.hearingVenue && `${h.hearingVenue} · `}{h.hearingTime}
                    </p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${PANEL_ROLE_CLS[h.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                      {h.panelRole}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active cases */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">My Cases</p>
            <button onClick={() => navigate('/panel/cases')} className="text-xs text-maroon font-medium hover:underline">
              View All →
            </button>
          </div>
          {!data?.activeCases?.length ? (
            <p className="text-sm text-gray-400">No active cases assigned.</p>
          ) : (
            <div className="space-y-2">
              {data.activeCases.slice(0, 6).map(c => {
                const { label, cls } = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-700' };
                return (
                  <div
                    key={c.caseId}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg"
                    onClick={() => navigate(`/panel/cases/${c.caseId}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-maroon font-semibold">{c.referenceNumber}</p>
                      <p className="text-xs text-gray-500 truncate">{c.studentName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PANEL_ROLE_CLS[c.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                        {c.panelRole}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CommitteeLayout>
  );
}

function StatCard({ label, value, colour }) {
  const cls = {
    maroon: { bg: 'bg-red-50 border-red-100', text: 'text-maroon' },
    amber:  { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
    teal:   { bg: 'bg-teal-50 border-teal-100', text: 'text-teal-700' },
  }[colour] || { bg: 'bg-white border-gray-200', text: 'text-gray-900' };
  return (
    <div className={`border rounded-xl p-5 ${cls.bg}`}>
      <p className={`text-3xl font-bold ${cls.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
