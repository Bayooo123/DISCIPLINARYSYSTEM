import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const STATUS_PILL = {
  COMPLAINT_FILED:    { label: 'Filed',                cls: 'bg-gray-100 text-gray-700' },
  STUDENT_NOTIFIED:   { label: 'Notified',             cls: 'bg-gray-100 text-gray-700' },
  AWAITING_RESPONSE:  { label: 'Awaiting Response',    cls: 'bg-amber-100 text-amber-800' },
  RESPONSE_RECEIVED:  { label: 'Response Received',    cls: 'bg-blue-100 text-blue-800' },
  RESPONSE_OVERDUE:   { label: 'Overdue',              cls: 'bg-red-100 text-red-800' },
  PANEL_CONSTITUTED:  { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED:  { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:   { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED:  { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:             { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:          { label: 'Escalated',            cls: 'bg-red-100 text-red-900' },
};

function StatusPill({ status }) {
  const { label, cls } = STATUS_PILL[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function AlertStrip({ colour, title, items, cta, onAction }) {
  if (!items?.length) return null;
  const colours = {
    red:    'bg-red-50 border-red-200 text-red-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };
  return (
    <div className={`border rounded-xl p-4 mb-4 ${colours[colour]}`}>
      <p className="font-semibold text-sm mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm">{item.label}</span>
            <button onClick={() => onAction(item.caseId)} className="text-xs font-medium underline hover:no-underline">
              {cta} →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommitteeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/committee/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CommitteeLayout title="Dashboard"><FullPageSpinner /></CommitteeLayout>;

  const stats = data?.stats || {};
  const actions = data?.chairmanActions || {};
  const isChairman = user?.isChairman;
  const totalPendingActions = (actions.needsPanel?.length || 0) + (actions.needsHearing?.length || 0) + (actions.hearingToday?.length || 0);

  return (
    <CommitteeLayout title="Committee Dashboard">

      {/* Chairman Action Queue */}
      {isChairman && totalPendingActions > 0 && (
        <div className="bg-maroon rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-serif font-bold text-lg">Your Action Queue</p>
              <p className="text-white/60 text-xs mt-0.5">{totalPendingActions} item{totalPendingActions !== 1 ? 's' : ''} require your attention</p>
            </div>
            <span className="bg-gold text-maroon text-xs font-bold px-3 py-1 rounded-full">{totalPendingActions} pending</span>
          </div>
          <div className="space-y-3">
            {actions.hearingToday?.map(a => (
              <ActionItem key={a.caseId} icon="🔔" urgency="today" label={`Hearing today — ${a.referenceNumber} · ${a.studentName}`} sub={`${a.hearingTime} · ${a.hearingVenue}`} onClick={() => navigate(`/committee/cases/${a.caseId}`)} />
            ))}
            {actions.needsPanel?.map(a => (
              <ActionItem key={a.caseId} icon="👥" urgency="high" label={`Constitute panel — ${a.referenceNumber} · ${a.studentName}`} sub="Response received, awaiting panel assignment" onClick={() => navigate(`/committee/cases/${a.caseId}`)} />
            ))}
            {actions.needsHearing?.map(a => (
              <ActionItem key={a.caseId} icon="📅" urgency="medium" label={`Schedule hearing — ${a.referenceNumber} · ${a.studentName}`} sub="Panel constituted, hearing date not yet set" onClick={() => navigate(`/committee/cases/${a.caseId}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cases"        value={stats.totalCases || 0}       colour="maroon" />
        <StatCard label="Pending Response"   value={stats.pendingResponse || 0}  colour="amber" />
        <StatCard label="Hearings This Week" value={stats.hearingsThisWeek || 0} colour="teal" />
        <StatCard label="Cases Closed"       value={stats.closedThisYear || 0}   colour="green" />
      </div>

      {/* Alert strips */}
      <AlertStrip colour="red" title="Non-Appearance Flags"
        items={(data?.nonAppearanceFlags || []).map(f => ({ caseId: f.caseId, label: `${f.referenceNumber} · ${f.studentName} · Hearing was ${formatDate(f.hearingDate)}` }))}
        cta="View Case" onAction={id => navigate(`/committee/cases/${id}`)} />

      <AlertStrip colour="yellow" title="Verdicts Awaiting Ratification"
        items={(data?.awaitingRatification || []).map(f => ({ caseId: f.caseId, label: `${f.referenceNumber} · ${f.studentName} · Recorded by ${f.chairpersonName} on ${formatDate(f.verdictRecordedAt)}` }))}
        cta="View Case" onAction={id => navigate(`/committee/cases/${id}`)} />

      <AlertStrip colour="amber" title="Overdue Responses"
        items={(data?.overdueAlerts || []).map(f => ({ caseId: f.caseId, label: `${f.referenceNumber} · ${f.studentName} · Deadline passed ${f.daysPast} day${f.daysPast !== 1 ? 's' : ''} ago` }))}
        cta="View Case" onAction={id => navigate(`/committee/cases/${id}`)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Upcoming hearings */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Upcoming Hearings</p>
          {!data?.upcomingHearings?.length ? (
            <p className="text-sm text-gray-400">No upcoming hearings.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingHearings.map((h, i) => (
                <div key={i} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg" onClick={() => navigate(`/committee/cases/${h.caseId}`)}>
                  <div className="bg-maroon text-gold text-center rounded-lg px-2 py-1 min-w-[44px]">
                    <div className="text-xs font-bold">{new Date(h.hearingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{h.referenceNumber} · {h.studentName}</p>
                    <p className="text-xs text-gray-500">{h.hearingVenue} · {h.hearingTime}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent cases */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Recent Cases</p>
            <button onClick={() => navigate('/committee/cases')} className="text-xs text-maroon font-medium hover:underline">View All →</button>
          </div>
          <RecentCases navigate={navigate} />
        </div>
      </div>
    </CommitteeLayout>
  );
}

function RecentCases({ navigate }) {
  const [cases, setCases] = useState([]);
  useEffect(() => {
    api.get('/committee/cases?limit=8').then(r => setCases(r.cases || [])).catch(() => {});
  }, []);
  if (!cases.length) return <p className="text-sm text-gray-400">No cases found.</p>;
  return (
    <div className="space-y-2">
      {cases.map(c => (
        <div key={c.id} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg" onClick={() => navigate(`/committee/cases/${c.id}`)}>
          <div>
            <span className="font-mono text-xs text-maroon font-semibold">{c.referenceNumber}</span>
            <p className="text-xs text-gray-500">{c.student?.firstName} {c.student?.lastName}</p>
          </div>
          <StatusPill status={c.status} />
        </div>
      ))}
    </div>
  );
}

function ActionItem({ icon, urgency, label, sub, onClick }) {
  const urgencyBg = { today: 'bg-white/20 border-white/30', high: 'bg-white/10 border-white/20', medium: 'bg-white/5 border-white/10' };
  return (
    <button onClick={onClick} className={`w-full text-left flex items-center gap-3 border rounded-lg px-4 py-3 hover:bg-white/25 transition-colors ${urgencyBg[urgency]}`}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        <p className="text-xs text-white/60 mt-0.5 truncate">{sub}</p>
      </div>
      <span className="text-white/50 flex-shrink-0">→</span>
    </button>
  );
}

function StatCard({ label, value, colour }) {
  const colours = {
    maroon: 'bg-red-50 border-red-100',
    amber:  'bg-amber-50 border-amber-100',
    teal:   'bg-teal-50 border-teal-100',
    green:  'bg-green-50 border-green-100',
  };
  const textColours = { maroon: 'text-maroon', amber: 'text-amber-700', teal: 'text-teal-700', green: 'text-green-700' };
  return (
    <div className={`border rounded-xl p-5 ${colours[colour]}`}>
      <p className={`text-3xl font-bold ${textColours[colour]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
