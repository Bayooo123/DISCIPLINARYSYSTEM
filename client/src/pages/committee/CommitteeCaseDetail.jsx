import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const STATUS_META = {
  COMPLAINT_FILED:   { label: 'Filed',                cls: 'bg-gray-100 text-gray-700' },
  STUDENT_NOTIFIED:  { label: 'Notified',             cls: 'bg-gray-100 text-gray-700' },
  AWAITING_RESPONSE: { label: 'Awaiting Response',    cls: 'bg-amber-100 text-amber-800' },
  RESPONSE_RECEIVED: { label: 'Response Received',    cls: 'bg-blue-100 text-blue-800' },
  RESPONSE_OVERDUE:  { label: 'Overdue',              cls: 'bg-red-100 text-red-800' },
  PANEL_CONSTITUTED: { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED: { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:  { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED: { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:            { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:         { label: 'Escalated',            cls: 'bg-red-100 text-red-900' },
};

const VERDICT_LABELS = { UPHELD: 'Upheld', DISMISSED: 'Dismissed', PARTIALLY_UPHELD: 'Partially Upheld' };
const VERDICT_CLS    = { UPHELD: 'text-red-700 bg-red-50', DISMISSED: 'text-green-700 bg-green-50', PARTIALLY_UPHELD: 'text-amber-700 bg-amber-50' };
const PLEA_LABELS    = { GUILTY: 'Guilty', NOT_GUILTY: 'Not Guilty' };

const TABS = [
  { id: 'info',     label: 'Case Info' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'response', label: 'Student Response' },
  { id: 'panel',    label: 'Panel & Hearing' },
  { id: 'verdict',  label: 'Verdict' },
  { id: 'audit',    label: 'Audit Log' },
];

export default function CommitteeCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.get(`/committee/cases/${id}`)
      .then(setC)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
    api.get('/committee/eligible-users').then(setEligibleUsers).catch(() => {});
  }, [reload]);

  if (loading) return <CommitteeLayout title="Case"><FullPageSpinner /></CommitteeLayout>;
  if (!c) return (
    <CommitteeLayout title="Case Not Found">
      <p className="text-gray-500 p-6">Case not found or access denied.</p>
    </CommitteeLayout>
  );

  const isChairman = user?.isChairman;
  const { label: statusLabel, cls: statusCls } = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-700' };

  async function doAction(path, method, body, successMsg) {
    setSaving(true);
    try {
      if (method === 'POST')  await api.post(path, body);
      if (method === 'PATCH') await api.patch(path, body);
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
            {c.status === 'ESCALATED' && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Non-Appearance Flagged</span>
            )}
          </div>
          <p className="text-xs text-gray-400">Filed {formatDateTime(c.filedAt)} by {c.filedBy?.firstName} {c.filedBy?.lastName}</p>
          {c.hearingDate && (
            <p className="text-xs text-teal-700 mt-1 font-medium">
              Hearing: {formatDate(c.hearingDate)}{c.hearingTime ? ` at ${c.hearingTime}` : ''}{c.hearingVenue ? ` — ${c.hearingVenue}` : ''}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/committee/cases')} className="text-sm text-maroon hover:underline">← All Cases</button>
      </div>

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
      {tab === 'panel'    && (
        <TabPanel
          c={c} id={id} isChairman={isChairman}
          eligibleUsers={eligibleUsers}
          doAction={doAction} saving={saving}
        />
      )}
      {tab === 'verdict'  && (
        <TabVerdict c={c} id={id} isChairman={isChairman} doAction={doAction} saving={saving} />
      )}
      {tab === 'audit'    && <TabAudit c={c} />}
    </CommitteeLayout>
  );
}

// ── Tab: Case Info ─────────────────────────────────────────────────────────────

function TabInfo({ c }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <Section title="Student Details">
          <Field label="Full Name"      value={`${c.student?.firstName} ${c.student?.lastName}`} />
          <Field label="Matric Number"  value={c.student?.matricNumber} />
          <Field label="Faculty"        value={c.student?.faculty} />
          <Field label="Department"     value={c.student?.department} />
          <Field label="Level"          value={c.student?.level} />
          <Field label="Email"          value={c.student?.email} />
          <Field label="Phone"          value={c.student?.phone} />
        </Section>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <Section title="Complaint Particulars">
          <Field label="Reference No."  value={c.referenceNumber} mono />
          <Field label="Filed"          value={formatDateTime(c.filedAt)} />
          <Field label="Response Deadline" value={formatDate(c.responseDeadline)} />
          {c.closedAt && <Field label="Closed"      value={formatDateTime(c.closedAt)} />}
        </Section>

        <Section title="Offences Charged">
          {c.offences?.length > 0 ? (
            <div className="space-y-2">
              {c.offences.map((o, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{o.offenceType?.name}</p>
                    <p className="text-xs text-gray-400">{o.offenceType?.category?.replace(/_/g, ' ')}</p>
                    {o.description && <p className="text-xs text-gray-600 mt-1">{o.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No offences recorded.</p>}
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
  const complainant = (c.evidence || []).filter(e => e.uploadedBy === 'OFFICER' || e.uploadedBy === 'COMPLAINANT');
  const student     = (c.evidence || []).filter(e => e.uploadedBy === 'STUDENT');

  return (
    <div className="space-y-6">
      <Section title={`Complainant Evidence (${complainant.length})`}>
        {complainant.length === 0
          ? <p className="text-sm text-gray-400">No evidence submitted by complainant.</p>
          : <EvidenceGrid items={complainant} />}
      </Section>

      {student.length > 0 && (
        <Section title={`Student Evidence (${student.length})`}>
          <EvidenceGrid items={student} />
        </Section>
      )}
    </div>
  );
}

function EvidenceGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((e, i) => (
        <a
          key={i}
          href={e.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-2xl">{fileIcon(e.fileType)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{e.fileName || `Evidence ${i + 1}`}</p>
            <p className="text-xs text-gray-400">{formatDateTime(e.uploadedAt)}</p>
          </div>
          <span className="text-xs text-maroon font-medium">View →</span>
        </a>
      ))}
    </div>
  );
}

function fileIcon(type) {
  if (!type) return '📎';
  if (type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  if (type.includes('video')) return '🎥';
  return '📎';
}

// ── Tab: Student Response ──────────────────────────────────────────────────────

function TabResponse({ c }) {
  const hasResponse = c.studentResponse || c.plea;
  return (
    <div className="space-y-4">
      {!hasResponse && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">No student response received yet.</p>
          <p className="text-xs text-amber-600 mt-1">Deadline: {formatDate(c.responseDeadline)}</p>
        </div>
      )}
      {c.plea && (
        <Section title="Student Plea">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
            c.plea === 'GUILTY' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {PLEA_LABELS[c.plea] || c.plea}
          </span>
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

function TabPanel({ c, id, isChairman, eligibleUsers, doAction, saving }) {
  const canSchedule = ['PANEL_CONSTITUTED', 'RESPONSE_RECEIVED', 'RESPONSE_OVERDUE', 'HEARING_SCHEDULED'].includes(c.status);
  const canRecord   = c.status === 'HEARING_SCHEDULED' && c.studentAppeared === null;

  return (
    <div className="space-y-6">
      {/* Panel Members */}
      <Section title="Panel Members">
        {!c.panel && isChairman && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-4">No panel has been constituted for this case yet.</p>
            <ConstitutePanelForm caseId={id} eligibleUsers={eligibleUsers} doAction={doAction} saving={saving} />
          </div>
        )}
        {!c.panel && !isChairman && (
          <p className="text-sm text-gray-400">Panel not yet constituted. The Chairman must appoint members.</p>
        )}
        {c.panel && (
          <PanelMembersTable panel={c.panel} />
        )}
      </Section>

      {/* Hearing */}
      {c.panel && (
        <Section title="Hearing">
          {c.hearingDate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(c.hearingDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Time</p>
                  <p className="text-sm font-medium text-gray-900">{c.hearingTime || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Venue</p>
                  <p className="text-sm font-medium text-gray-900">{c.hearingVenue || '—'}</p>
                </div>
                {c.penaltyRange && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Penalty Range</p>
                    <p className="text-sm font-medium text-gray-900">{c.penaltyRange}</p>
                  </div>
                )}
              </div>
              {c.internalHearingNotes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Internal Notes (Confidential)</p>
                  <p className="text-sm text-yellow-900">{c.internalHearingNotes}</p>
                </div>
              )}
              {isChairman && canSchedule && (
                <div>
                  <p className="text-xs text-gray-500 mb-3 font-medium">Reschedule Hearing</p>
                  <ScheduleHearingForm caseId={id} existing={c} doAction={doAction} saving={saving} />
                </div>
              )}
            </div>
          ) : (
            isChairman && canSchedule
              ? <ScheduleHearingForm caseId={id} existing={null} doAction={doAction} saving={saving} />
              : <p className="text-sm text-gray-400">Hearing not yet scheduled.</p>
          )}
        </Section>
      )}

      {/* Attendance */}
      {isChairman && canRecord && (
        <Section title="Record Attendance">
          <p className="text-sm text-gray-600 mb-4">Has the student appeared at the scheduled hearing?</p>
          <div className="flex gap-3">
            <button
              onClick={() => doAction(`/committee/cases/${id}/appearance`, 'PATCH', { studentAppeared: true }, 'Appearance recorded')}
              disabled={saving}
              className="btn btn-primary"
            >
              Student Appeared
            </button>
            <button
              onClick={() => doAction(`/committee/cases/${id}/non-appearance`, 'PATCH', {}, 'Non-appearance flagged')}
              disabled={saving}
              className="btn btn-danger"
            >
              Flag Non-Appearance
            </button>
          </div>
        </Section>
      )}

      {c.studentAppeared !== null && c.studentAppeared !== undefined && (
        <Section title="Attendance Result">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
            c.studentAppeared ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {c.studentAppeared ? 'Student Appeared' : 'Student Did Not Appear'}
          </span>
          {c.nonAppearanceFlaggedAt && (
            <p className="text-xs text-gray-400 mt-2">Flagged {formatDateTime(c.nonAppearanceFlaggedAt)}</p>
          )}
        </Section>
      )}
    </div>
  );
}

function ConstitutePanelForm({ caseId, eligibleUsers, doAction, saving }) {
  const [rows, setRows] = useState([
    { userId: '', panelRole: 'CHAIRPERSON' },
    { userId: '', panelRole: 'SECRETARY' },
    { userId: '', panelRole: 'MEMBER' },
  ]);

  const selectedIds = rows.map(r => r.userId).filter(Boolean);
  const available = (currentId) => eligibleUsers.filter(u => !selectedIds.includes(u.id) || u.id === currentId);

  const update = (i, key, val) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const add    = () => setRows(prev => [...prev, { userId: '', panelRole: 'MEMBER' }]);
  const remove = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  async function submit(e) {
    e.preventDefault();
    const members = rows.filter(r => r.userId);
    await doAction(`/committee/cases/${caseId}/panel`, 'POST', { members }, 'Panel constituted successfully');
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select className="input flex-1" value={row.userId} onChange={e => update(i, 'userId', e.target.value)} required>
            <option value="">Select member…</option>
            {available(row.userId).map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} {u.jobTitle ? `— ${u.jobTitle}` : ''}
              </option>
            ))}
          </select>
          <select className="input w-36" value={row.panelRole} onChange={e => update(i, 'panelRole', e.target.value)}>
            <option value="CHAIRPERSON">Chairperson</option>
            <option value="SECRETARY">Secretary</option>
            <option value="MEMBER">Member</option>
          </select>
          {rows.length > 3 && (
            <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700 text-lg px-1">✕</button>
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={add} className="btn btn-secondary text-xs">+ Add Member</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Constituting…' : 'Constitute Panel'}
        </button>
      </div>
    </form>
  );
}

function PanelMembersTable({ panel }) {
  const ROLE_CLS = {
    CHAIRPERSON: 'bg-maroon text-white',
    SECRETARY: 'bg-blue-100 text-blue-800',
    MEMBER: 'bg-gray-100 text-gray-700',
  };
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Panel: {panel.name}</p>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Title</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {panel.members?.map(m => (
              <tr key={m.user.id}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{m.user.firstName} {m.user.lastName}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_CLS[m.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                    {m.panelRole}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{m.user.jobTitle || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleHearingForm({ caseId, existing, doAction, saving }) {
  const [form, setForm] = useState({
    hearingDate: existing?.hearingDate ? new Date(existing.hearingDate).toISOString().split('T')[0] : '',
    hearingTime: existing?.hearingTime || '',
    hearingVenue: existing?.hearingVenue || '',
    penaltyRange: existing?.penaltyRange || '',
    internalHearingNotes: existing?.internalHearingNotes || '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const method = existing?.hearingDate ? 'PATCH' : 'POST';
    await doAction(
      `/committee/cases/${caseId}/hearing`,
      method,
      form,
      existing?.hearingDate ? 'Hearing rescheduled successfully' : 'Hearing scheduled successfully',
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date <span className="text-red-500">*</span></label>
          <input type="date" className="input" value={form.hearingDate} onChange={set('hearingDate')} required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Time</label>
          <input type="time" className="input" value={form.hearingTime} onChange={set('hearingTime')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Venue <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. VC's Board Room" value={form.hearingVenue} onChange={set('hearingVenue')} required />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Penalty Range (optional)</label>
        <input className="input" placeholder="e.g. Suspension 1–2 semesters" value={form.penaltyRange} onChange={set('penaltyRange')} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Internal Notes (confidential)</label>
        <textarea className="input" rows={3} placeholder="Not visible to student or panel members" value={form.internalHearingNotes} onChange={set('internalHearingNotes')} />
      </div>
      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? 'Saving…' : existing?.hearingDate ? 'Reschedule Hearing' : 'Schedule Hearing'}
      </button>
    </form>
  );
}

// ── Tab: Verdict ───────────────────────────────────────────────────────────────

function TabVerdict({ c, id, isChairman, doAction, saving }) {
  const [appealForm, setAppealForm] = useState({ appealNotes: '', show: false });

  const hasVerdict = c.verdictFinding || c.verdictRecordedAt;
  const isRatified = !!c.verdictRatifiedAt;

  async function submitAppeal(e) {
    e.preventDefault();
    await doAction(`/committee/cases/${id}/appeal`, 'PATCH', { appealNotes: appealForm.appealNotes }, 'Appeal filed successfully');
  }

  if (!hasVerdict) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-400 text-sm">No verdict has been recorded yet.</p>
        <p className="text-xs text-gray-300 mt-1">The Panel Chairperson will record the verdict after the hearing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ratification status */}
      {!isRatified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-yellow-600 text-lg">⏳</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">Verdict Awaiting Ratification</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Recorded by {c.verdictRecordedBy?.firstName} {c.verdictRecordedBy?.lastName} on {formatDateTime(c.verdictRecordedAt)}.
              The Panel Secretary must ratify before it is communicated to the student.
            </p>
          </div>
        </div>
      )}

      {/* Verdict details */}
      <Section title="Verdict Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Finding</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${VERDICT_CLS[c.verdictFinding] || 'bg-gray-100 text-gray-700'}`}>
                {VERDICT_LABELS[c.verdictFinding] || c.verdictFinding}
              </span>
            </div>
            {c.verdictPenalty && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Penalty</p>
                <p className="text-sm font-medium text-gray-900">{c.verdictPenalty}</p>
              </div>
            )}
            {c.verdictEffectiveDate && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Effective Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(c.verdictEffectiveDate)}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {c.appealDeadline && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Appeal Deadline</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(c.appealDeadline)}</p>
              </div>
            )}
            {c.verdictRecordedAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Recorded</p>
                <p className="text-sm text-gray-700">{formatDateTime(c.verdictRecordedAt)} by {c.verdictRecordedBy?.firstName} {c.verdictRecordedBy?.lastName}</p>
              </div>
            )}
            {c.verdictRatifiedAt && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Ratified</p>
                <p className="text-sm text-gray-700">{formatDateTime(c.verdictRatifiedAt)} by {c.verdictRatifiedBy?.firstName} {c.verdictRatifiedBy?.lastName}</p>
              </div>
            )}
          </div>
        </div>
        {c.hearingOutcome && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1">Hearing Outcome Summary</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.hearingOutcome}</p>
          </div>
        )}
      </Section>

      {/* PDFs */}
      {(c.caseRecordPdfUrl || c.verdictLetterPdfUrl) && (
        <Section title="Documents">
          <div className="flex gap-3 flex-wrap">
            {c.caseRecordPdfUrl && (
              <a href={c.caseRecordPdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
                📄 Download Case Record
              </a>
            )}
            {c.verdictLetterPdfUrl && (
              <a href={c.verdictLetterPdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
                📋 Download Verdict Letter
              </a>
            )}
          </div>
          <div className="flex gap-3 flex-wrap mt-3">
            <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/committee/cases/${id}/export/case-record`}
              target="_blank" rel="noopener noreferrer" className="text-xs text-maroon hover:underline">
              Regenerate Case Record PDF →
            </a>
            {c.status === 'CLOSED' && (
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/committee/cases/${id}/export/verdict-letter`}
                target="_blank" rel="noopener noreferrer" className="text-xs text-maroon hover:underline">
                Regenerate Verdict Letter PDF →
              </a>
            )}
          </div>
        </Section>
      )}

      {/* Appeal */}
      {c.status === 'CLOSED' && isChairman && (
        <Section title="Appeal">
          {c.appealFiled ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm font-medium text-orange-800">Appeal Filed</p>
              <p className="text-xs text-orange-600 mt-1">{formatDateTime(c.appealFiledAt)}</p>
              {c.appealNotes && <p className="text-sm text-orange-700 mt-2">{c.appealNotes}</p>}
            </div>
          ) : (
            <>
              {!appealForm.show && (
                <button onClick={() => setAppealForm(f => ({ ...f, show: true }))} className="btn btn-secondary">
                  File an Appeal
                </button>
              )}
              {appealForm.show && (
                <form onSubmit={submitAppeal} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Appeal Notes</label>
                    <textarea
                      className="input" rows={4} required
                      placeholder="Grounds for the appeal…"
                      value={appealForm.appealNotes}
                      onChange={e => setAppealForm(f => ({ ...f, appealNotes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Filing…' : 'File Appeal'}</button>
                    <button type="button" onClick={() => setAppealForm({ appealNotes: '', show: false })} className="btn btn-secondary">Cancel</button>
                  </div>
                </form>
              )}
            </>
          )}
        </Section>
      )}
    </div>
  );
}

// ── Tab: Audit Log ─────────────────────────────────────────────────────────────

function TabAudit({ c }) {
  const logs = c.auditLogs || [];
  if (logs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-400 text-sm">No audit log entries yet.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Case Activity Timeline</p>
      </div>
      <div className="divide-y divide-gray-50">
        {logs.map((log, i) => (
          <div key={log.id || i} className="px-5 py-4 flex gap-4">
            <div className="flex-shrink-0 w-1.5 flex flex-col items-center pt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-maroon mt-1" />
              {i < logs.length - 1 && <div className="flex-1 w-px bg-gray-200 mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold text-maroon uppercase tracking-wide">{log.action?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(log.timestamp)}</p>
              </div>
              <p className="text-sm text-gray-700 mt-0.5">{log.description}</p>
              {log.actor && (
                <p className="text-xs text-gray-400 mt-1">
                  {log.actor.firstName} {log.actor.lastName} · {log.actor.role?.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
