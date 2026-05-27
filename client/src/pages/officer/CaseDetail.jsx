import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import OfficerLayout from '../../components/ui/OfficerLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import CasePipeline from '../../components/officer/CasePipeline';
import CaseTimeline from '../../components/officer/CaseTimeline';
import OffenceChip from '../../components/officer/OffenceChip';
import StudentCard from '../../components/officer/StudentCard';
import { formatDate, formatDateTime, daysUntil } from '../../utils/formatters';

const PLEA_LABEL = { GUILTY: 'Guilty', NOT_GUILTY: 'Not Guilty' };
const PLEA_CLS   = { GUILTY: 'bg-red-100 text-red-800', NOT_GUILTY: 'bg-green-100 text-green-800' };

export default function CaseDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [c, setC]           = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get(`/cases/${id}`),
      api.get(`/cases/${id}/evidence`),
    ]).then(([caseData, evData]) => {
      setC(caseData);
      setEvidence(evData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (!c)      return (
    <OfficerLayout title="Case Not Found">
      <div className="text-center py-16">
        <p className="text-muted">This case could not be found.</p>
        <Link to="/officer/cases" className="text-maroon text-sm hover:underline mt-2 inline-block">← Back to cases</Link>
      </div>
    </OfficerLayout>
  );

  const daysLeft = daysUntil(c.responseDeadline);
  const isOverdue = daysLeft !== null && daysLeft < 0 && !['RESPONSE_RECEIVED', 'PANEL_CONSTITUTED', 'HEARING_SCHEDULED', 'HEARING_COMPLETE', 'VERDICT_DELIVERED', 'CLOSED'].includes(c.status);

  return (
    <OfficerLayout title={`Case ${c.referenceNumber}`}>
      {/* Success banner */}
      {location.state?.filed && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Complaint filed successfully</p>
            <p className="text-xs text-green-700">The student has been notified by email and the response deadline is set.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-border rounded-xl p-5 mb-4 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-serif font-bold text-ink">{c.referenceNumber}</h2>
            <StatusBadge status={c.status} />
          </div>
          <p className="text-xs text-muted">Filed {formatDateTime(c.filedAt)}</p>
        </div>
        <Link to="/officer/cases" className="text-sm text-maroon hover:underline flex-shrink-0">← All Cases</Link>
      </div>

      {/* Pipeline */}
      <div className="bg-white border border-border rounded-xl p-5 mb-4 overflow-x-auto">
        <CasePipeline status={c.status} />
      </div>

      {/* Deadline alert */}
      {c.responseDeadline && !['RESPONSE_RECEIVED', 'PANEL_CONSTITUTED', 'HEARING_SCHEDULED', 'HEARING_COMPLETE', 'VERDICT_DELIVERED', 'CLOSED'].includes(c.status) && (
        <div className={`mb-4 rounded-xl px-5 py-3 flex items-center gap-3 border ${
          isOverdue
            ? 'bg-red-50 border-red-200 text-red-800'
            : daysLeft <= 1
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span>{isOverdue ? '⚠' : '🕐'}</span>
          <p className="text-sm">
            {isOverdue
              ? `Response deadline passed ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago (${formatDate(c.responseDeadline)})`
              : `Student must respond by ${formatDate(c.responseDeadline)} — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-4 gap-1">
        {['overview', 'response', 'evidence', 'timeline'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors
              ${tab === t ? 'border-maroon text-maroon' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Student */}
            <Card title="Student">
              <StudentCard student={c.student} />
            </Card>

            {/* Offences */}
            <Card title="Alleged Offences">
              <div className="space-y-2">
                {c.offences?.map(o => (
                  <OffenceChip key={o.id} name={o.offenceType?.name} penaltyTier={o.offenceType?.penaltyTier} />
                ))}
              </div>
            </Card>

            {/* Description */}
            <Card title="Description of Incident">
              <p className="text-sm text-ink whitespace-pre-wrap">{c.description}</p>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Incident details */}
            <Card title="Incident Details">
              <dl className="space-y-2 text-sm">
                <Row label="Date"       value={formatDate(c.incidentDate)} />
                <Row label="Location"   value={c.incidentLocation || '—'} />
                <Row label="Witness"    value={c.witnessName || '—'} />
                {c.courseCode && <Row label="Course" value={`${c.courseCode}${c.courseTitle ? ` — ${c.courseTitle}` : ''}`} />}
                <Row label="Origin"     value={c.originType} />
              </dl>
            </Card>

            {/* Panel */}
            {c.panel && (
              <Card title="Assigned Panel">
                <p className="text-sm font-medium text-ink">{c.panel.name}</p>
                <div className="mt-2 space-y-1">
                  {c.panel.members?.map(m => (
                    <p key={m.id} className="text-xs text-muted">
                      {m.user?.firstName} {m.user?.lastName} · {m.panelRole}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* Hearing */}
            {c.hearingDate && (
              <Card title="Hearing">
                <dl className="space-y-2 text-sm">
                  <Row label="Date"  value={formatDateTime(c.hearingDate)} />
                  <Row label="Venue" value={c.hearingVenue || '—'} />
                </dl>
              </Card>
            )}

            {/* Verdict */}
            {c.verdict && (
              <Card title="Verdict">
                <p className="text-sm text-ink whitespace-pre-wrap">{c.verdict}</p>
                {c.penalty && (
                  <p className="mt-2 text-sm font-semibold text-red-700">Penalty: {c.penalty}</p>
                )}
                <p className="text-xs text-muted mt-1">{formatDate(c.verdictAt)}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab: Response */}
      {tab === 'response' && (
        <div className="bg-white border border-border rounded-xl p-5">
          {c.studentResponse ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-medium text-ink">Student Response</h3>
                {c.plea && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PLEA_CLS[c.plea]}`}>
                    Plea: {PLEA_LABEL[c.plea]}
                  </span>
                )}
                <span className="text-xs text-muted">{formatDateTime(c.studentResponseAt)}</span>
              </div>
              <div className="bg-cream rounded-xl p-4">
                <p className="text-sm text-ink whitespace-pre-wrap">{c.studentResponse}</p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted text-sm">No response submitted yet.</p>
              {isOverdue && (
                <p className="text-red-600 text-xs mt-1">The response deadline has passed.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Evidence */}
      {tab === 'evidence' && (
        <div className="bg-white border border-border rounded-xl p-5">
          {evidence.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted text-sm">No evidence uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map(e => (
                <div key={e.id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                  <span className="text-2xl">📎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{e.fileName}</p>
                    <p className="text-xs text-muted">
                      {e.submittedBy} · {e.fileType} · {(e.fileSize / 1024).toFixed(1)} KB · {formatDateTime(e.uploadedAt)}
                    </p>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${e.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-maroon hover:underline flex-shrink-0"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Timeline */}
      {tab === 'timeline' && (
        <div className="bg-white border border-border rounded-xl p-5">
          <CaseTimeline auditLogs={c.auditLogs} />
        </div>
      )}
    </OfficerLayout>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted w-24 flex-shrink-0 text-xs">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    COMPLAINT_FILED:   { label: 'Filed',               cls: 'bg-orange-100 text-orange-800' },
    STUDENT_NOTIFIED:  { label: 'Student Notified',    cls: 'bg-yellow-100 text-yellow-800' },
    AWAITING_RESPONSE: { label: 'Awaiting Response',   cls: 'bg-amber-100 text-amber-800' },
    RESPONSE_RECEIVED: { label: 'Response In',         cls: 'bg-blue-100 text-blue-800' },
    RESPONSE_OVERDUE:  { label: 'Response Overdue',    cls: 'bg-red-100 text-red-800' },
    PANEL_CONSTITUTED: { label: 'Panel Constituted',   cls: 'bg-purple-100 text-purple-800' },
    HEARING_SCHEDULED: { label: 'Hearing Scheduled',   cls: 'bg-indigo-100 text-indigo-800' },
    HEARING_COMPLETE:  { label: 'Hearing Complete',    cls: 'bg-teal-100 text-teal-800' },
    VERDICT_DELIVERED: { label: 'Verdict Delivered',   cls: 'bg-green-100 text-green-800' },
    CLOSED:            { label: 'Closed',              cls: 'bg-gray-100 text-gray-600' },
    ESCALATED:         { label: 'Escalated',           cls: 'bg-rose-100 text-rose-800' },
  };
  const b = MAP[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.cls}`}>{b.label}</span>;
}
