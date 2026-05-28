import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

const STATUS_META = {
  PANEL_CONSTITUTED: { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED: { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:  { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED: { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:            { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:         { label: 'Escalated',            cls: 'bg-red-100 text-red-800' },
};

const VERDICT_LABELS = { UPHELD: 'Upheld', DISMISSED: 'Dismissed', PARTIALLY_UPHELD: 'Partially Upheld' };
const VERDICT_CLS    = { UPHELD: 'text-red-700 bg-red-50', DISMISSED: 'text-green-700 bg-green-50', PARTIALLY_UPHELD: 'text-amber-700 bg-amber-50' };
const PLEA_LABELS    = { GUILTY: 'Guilty', NOT_GUILTY: 'Not Guilty' };
const PANEL_ROLE_CLS = { CHAIRPERSON: 'bg-maroon text-white', SECRETARY: 'bg-blue-100 text-blue-800', MEMBER: 'bg-gray-100 text-gray-700' };

const TABS = [
  { id: 'info',     label: 'Case Info' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'response', label: 'Student Response' },
  { id: 'hearing',  label: 'Panel & Hearing' },
  { id: 'verdict',  label: 'Verdict' },
];

export default function PanelCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.get(`/panel/cases/${id}`)
      .then(data => { setC(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <CommitteeLayout title="Case"><FullPageSpinner /></CommitteeLayout>;
  if (!c) return (
    <CommitteeLayout title="Case Not Found">
      <p className="text-gray-500 p-6">Case not found or you are not a member of this case's panel.</p>
    </CommitteeLayout>
  );

  const { label: statusLabel, cls: statusCls } = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-700' };

  async function doAction(path, method, body, successMsg) {
    setSaving(true);
    try {
      if (method === 'POST') await api.post(path, body);
      toast({ message: successMsg, type: 'success' });
      reload();
    } catch (err) {
      toast({ message: err?.error || 'Action failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CommitteeLayout title={`Case — ${c.referenceNumber}`}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-xl font-serif font-bold text-gray-900">{c.referenceNumber}</h2>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>{statusLabel}</span>
            {c.panelRole && (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${PANEL_ROLE_CLS[c.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                Your role: {c.panelRole}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Filed {formatDateTime(c.filedAt)}</p>
          {c.hearingDate && (
            <p className="text-xs text-teal-700 mt-1 font-medium">
              Hearing: {formatDate(c.hearingDate)}{c.hearingTime ? ` at ${c.hearingTime}` : ''}{c.hearingVenue ? ` — ${c.hearingVenue}` : ''}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/panel/cases')} className="text-sm text-maroon hover:underline">← My Cases</button>
      </div>

      {/* Action prompts */}
      {c.panelRole === 'CHAIRPERSON' && ['HEARING_COMPLETE', 'ESCALATED'].includes(c.status) && !c.verdictRecordedAt && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-purple-800">Action Required: Record Verdict</p>
            <p className="text-xs text-purple-600 mt-0.5">As Panel Chairperson, you must record the panel's verdict.</p>
          </div>
          <button onClick={() => setTab('verdict')} className="btn btn-primary text-xs">Go to Verdict Tab →</button>
        </div>
      )}
      {c.panelRole === 'SECRETARY' && c.status === 'VERDICT_DELIVERED' && c.verdictRecordedAt && !c.verdictRatifiedAt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-yellow-800">Action Required: Ratify Verdict</p>
            <p className="text-xs text-yellow-600 mt-0.5">As Panel Secretary, you must review and ratify the recorded verdict.</p>
          </div>
          <button onClick={() => setTab('verdict')} className="btn btn-primary text-xs">Go to Verdict Tab →</button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-maroon text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info'     && <TabInfo c={c} />}
      {tab === 'evidence' && <TabEvidence c={c} />}
      {tab === 'response' && <TabResponse c={c} />}
      {tab === 'hearing'  && <TabHearing c={c} />}
      {tab === 'verdict'  && (
        <TabVerdict c={c} id={id} doAction={doAction} saving={saving} />
      )}
    </CommitteeLayout>
  );
}

// ── Tab: Case Info ─────────────────────────────────────────────────────────────

function TabInfo({ c }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Section title="Student Details">
          <Field label="Full Name"     value={`${c.student?.firstName} ${c.student?.lastName}`} />
          <Field label="Matric"        value={c.student?.matricNumber} mono />
          <Field label="Faculty"       value={c.student?.faculty} />
          <Field label="Department"    value={c.student?.department} />
          <Field label="Level"         value={c.student?.level} />
        </Section>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <Section title="Complaint Particulars">
          <Field label="Reference"      value={c.referenceNumber} mono />
          <Field label="Filed"          value={formatDateTime(c.filedAt)} />
          <Field label="Response Deadline" value={formatDate(c.responseDeadline)} />
        </Section>
        <Section title="Offences Charged">
          {c.offences?.length > 0 ? (
            <div className="space-y-2">
              {c.offences.map((o, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{o.offenceType?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.offenceType?.category?.replace(/_/g, ' ')}</p>
                  {o.description && <p className="text-xs text-gray-600 mt-1">{o.description}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No offences listed.</p>}
        </Section>
        {c.complaintDescription && (
          <Section title="Complaint Description">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.complaintDescription}</p>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Tab: Evidence ──────────────────────────────────────────────────────────────

function TabEvidence({ c }) {
  const all = c.evidence || [];
  const complainant = all.filter(e => e.uploadedBy === 'OFFICER' || e.uploadedBy === 'COMPLAINANT');
  const student     = all.filter(e => e.uploadedBy === 'STUDENT');

  return (
    <div className="space-y-6">
      <Section title={`Complainant Evidence (${complainant.length})`}>
        {complainant.length === 0
          ? <p className="text-sm text-gray-400">No complainant evidence on record.</p>
          : <EvidenceList items={complainant} />}
      </Section>
      {student.length > 0 && (
        <Section title={`Student Evidence (${student.length})`}>
          <EvidenceList items={student} />
        </Section>
      )}
    </div>
  );
}

function EvidenceList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((e, i) => (
        <a
          key={i}
          href={e.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-xl">{e.fileType?.includes('pdf') ? '📄' : e.fileType?.includes('image') ? '🖼️' : '📎'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{e.fileName || `File ${i + 1}`}</p>
            <p className="text-xs text-gray-400">{formatDateTime(e.uploadedAt)}</p>
          </div>
          <span className="text-xs text-maroon font-medium">View →</span>
        </a>
      ))}
    </div>
  );
}

// ── Tab: Student Response ──────────────────────────────────────────────────────

function TabResponse({ c }) {
  return (
    <div className="space-y-4">
      {!c.studentResponse && !c.plea && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">No student response on record.</p>
        </div>
      )}
      {c.plea && (
        <Section title="Student Plea">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
            c.plea === 'GUILTY' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>{PLEA_LABELS[c.plea] || c.plea}</span>
        </Section>
      )}
      {c.studentResponse && (
        <Section title="Written Statement">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.studentResponse}</p>
          {c.studentResponseAt && (
            <p className="text-xs text-gray-400 mt-3">Submitted {formatDateTime(c.studentResponseAt)}</p>
          )}
        </Section>
      )}
    </div>
  );
}

// ── Tab: Panel & Hearing ───────────────────────────────────────────────────────

function TabHearing({ c }) {
  return (
    <div className="space-y-4">
      <Section title="Panel Members">
        {c.panel?.members?.length > 0 ? (
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Panel Role</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {c.panel.members.map(m => (
                  <tr key={m.user.id}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{m.user.firstName} {m.user.lastName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PANEL_ROLE_CLS[m.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                        {m.panelRole}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{m.user.jobTitle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400">Panel information unavailable.</p>}
      </Section>

      {c.hearingDate && (
        <Section title="Hearing Details">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Date"  value={formatDate(c.hearingDate)} />
            <Field label="Time"  value={c.hearingTime} />
            <Field label="Venue" value={c.hearingVenue} />
          </div>
          {c.penaltyRange && <Field label="Penalty Range" value={c.penaltyRange} />}
        </Section>
      )}

      {c.studentAppeared !== null && c.studentAppeared !== undefined && (
        <Section title="Attendance">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
            c.studentAppeared ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {c.studentAppeared ? 'Student Appeared' : 'Student Did Not Appear'}
          </span>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Verdict ───────────────────────────────────────────────────────────────

function TabVerdict({ c, id, doAction, saving }) {
  const panelRole   = c.panelRole;
  const canRecord   = panelRole === 'CHAIRPERSON' && ['HEARING_COMPLETE', 'ESCALATED'].includes(c.status) && !c.verdictRecordedAt;
  const canRatify   = panelRole === 'SECRETARY' && c.status === 'VERDICT_DELIVERED' && c.verdictRecordedAt && !c.verdictRatifiedAt;
  const hasVerdict  = c.verdictRecordedAt;
  const isRatified  = !!c.verdictRatifiedAt;

  return (
    <div className="space-y-6">
      {/* Verdict recording form — Chairperson */}
      {canRecord && (
        <VerdictForm caseId={id} doAction={doAction} saving={saving} />
      )}

      {/* Ratification form — Secretary */}
      {canRatify && (
        <RatificationForm c={c} caseId={id} doAction={doAction} saving={saving} />
      )}

      {/* Verdict display */}
      {hasVerdict && (
        <Section title="Recorded Verdict">
          {!isRatified && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              Awaiting Secretary ratification before communicating to student.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Finding</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${VERDICT_CLS[c.verdictFinding] || 'bg-gray-100 text-gray-700'}`}>
                  {VERDICT_LABELS[c.verdictFinding] || c.verdictFinding}
                </span>
              </div>
              {c.verdictPenalty && <Field label="Penalty" value={c.verdictPenalty} />}
              {c.verdictEffectiveDate && <Field label="Effective Date" value={formatDate(c.verdictEffectiveDate)} />}
            </div>
            <div className="space-y-3">
              {c.appealDeadline && <Field label="Appeal Deadline" value={formatDate(c.appealDeadline)} />}
              {c.verdictRecordedAt && (
                <Field label="Recorded" value={`${formatDateTime(c.verdictRecordedAt)} by ${c.verdictRecordedBy?.firstName} ${c.verdictRecordedBy?.lastName}`} />
              )}
              {c.verdictRatifiedAt && (
                <Field label="Ratified" value={`${formatDateTime(c.verdictRatifiedAt)} by ${c.verdictRatifiedBy?.firstName} ${c.verdictRatifiedBy?.lastName}`} />
              )}
            </div>
          </div>
          {c.hearingOutcome && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-1">Hearing Outcome Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.hearingOutcome}</p>
            </div>
          )}
          {isRatified && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <p className="text-sm text-green-800 font-medium">Verdict ratified and communicated to student.</p>
            </div>
          )}
        </Section>
      )}

      {!hasVerdict && !canRecord && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">No verdict recorded yet.</p>
          {panelRole === 'CHAIRPERSON' && (
            <p className="text-xs text-gray-300 mt-1">You may record a verdict once the hearing is complete.</p>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictForm({ caseId, doAction, saving }) {
  const [form, setForm] = useState({
    verdictFinding: '',
    verdictPenalty: '',
    verdictEffectiveDate: '',
    hearingOutcome: '',
    verdictDeliberationNotes: '',
  });
  const [confirm, setConfirm] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!confirm) { setConfirm(true); return; }
    await doAction(`/panel/cases/${caseId}/verdict`, 'POST', form, 'Verdict recorded. Secretary notified for ratification.');
  }

  return (
    <Section title="Record Verdict (Chairperson)">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Finding <span className="text-red-500">*</span></label>
            <select className="input" value={form.verdictFinding} onChange={set('verdictFinding')} required>
              <option value="">Select finding…</option>
              <option value="UPHELD">Upheld — Charges sustained</option>
              <option value="DISMISSED">Dismissed — Charges not proven</option>
              <option value="PARTIALLY_UPHELD">Partially Upheld — Some charges sustained</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Effective Date</label>
            <input type="date" className="input" value={form.verdictEffectiveDate} onChange={set('verdictEffectiveDate')} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Penalty / Sanction</label>
          <input
            className="input"
            placeholder="e.g. Suspension for 2 semesters, Rustication…"
            value={form.verdictPenalty}
            onChange={set('verdictPenalty')}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hearing Outcome Summary <span className="text-red-500">*</span></label>
          <textarea
            className="input" rows={4} required
            placeholder="Summarise the hearing proceedings, evidence considered and panel's reasoning…"
            value={form.hearingOutcome}
            onChange={set('hearingOutcome')}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Deliberation Notes (internal)</label>
          <textarea
            className="input" rows={3}
            placeholder="Panel deliberation notes — not shared with student…"
            value={form.verdictDeliberationNotes}
            onChange={set('verdictDeliberationNotes')}
          />
        </div>

        {confirm && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Confirm Verdict Submission</p>
            <p className="text-xs text-amber-700">
              Once submitted, the verdict will be sent to the Panel Secretary for ratification.
              You will not be able to edit it unless the Secretary rejects it. Proceed?
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Submitting…' : confirm ? 'Yes, Submit Verdict' : 'Submit Verdict'}
          </button>
          {confirm && (
            <button type="button" onClick={() => setConfirm(false)} className="btn btn-secondary">Cancel</button>
          )}
        </div>
      </form>
    </Section>
  );
}

function RatificationForm({ c, caseId, doAction, saving }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  async function ratify() {
    if (!confirmed) { setConfirmed(true); return; }
    await doAction(`/panel/cases/${caseId}/verdict/ratify`, 'POST', { confirmed: true }, 'Verdict ratified. Student notified and case closed.');
  }

  async function reject(e) {
    e.preventDefault();
    await doAction(`/panel/cases/${caseId}/verdict/reject`, 'POST', { reason }, 'Verdict returned to Chairperson.');
  }

  return (
    <Section title="Ratify Verdict (Secretary)">
      {/* Show recorded verdict for review */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Verdict Under Review</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Finding</p>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${VERDICT_CLS[c.verdictFinding] || 'bg-gray-100 text-gray-700'}`}>
              {VERDICT_LABELS[c.verdictFinding] || c.verdictFinding}
            </span>
          </div>
          {c.verdictPenalty && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Penalty</p>
              <p className="text-sm text-gray-900 font-medium">{c.verdictPenalty}</p>
            </div>
          )}
          {c.verdictEffectiveDate && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Effective Date</p>
              <p className="text-sm text-gray-900">{formatDate(c.verdictEffectiveDate)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Recorded by</p>
            <p className="text-sm text-gray-900">{c.verdictRecordedBy?.firstName} {c.verdictRecordedBy?.lastName}</p>
          </div>
        </div>
        {c.hearingOutcome && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1">Hearing Outcome</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.hearingOutcome}</p>
          </div>
        )}
      </div>

      {!rejectMode ? (
        <>
          {confirmed && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Confirm Ratification</p>
              <p className="text-xs text-amber-700">
                Ratifying will close this case and send the verdict to the student. This cannot be undone.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={ratify} disabled={saving} className="btn btn-primary">
              {saving ? 'Ratifying…' : confirmed ? 'Yes, Ratify Verdict' : 'Ratify Verdict'}
            </button>
            <button onClick={() => setRejectMode(true)} className="btn btn-danger">
              Reject & Return
            </button>
            {confirmed && (
              <button onClick={() => setConfirmed(false)} className="btn btn-secondary">Cancel</button>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={reject} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason for Rejection <span className="text-red-500">*</span></label>
            <textarea
              className="input" rows={4} required
              placeholder="Explain why the verdict is being returned to the Chairperson…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-danger">
              {saving ? 'Returning…' : 'Return to Chairperson'}
            </button>
            <button type="button" onClick={() => setRejectMode(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </Section>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="mb-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
