import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CommitteeCommitteeLayout from '../../components/CommitteeCommitteeLayout';
import StageBadge from '../../components/StageBadge';
import { useAuth } from '../../context/AuthContext';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('case');

  // Hearing form state
  const [scheduledAt, setScheduledAt] = useState('');
  const [venue, setVenue] = useState('');
  const [hearingLoading, setHearingLoading] = useState(false);

  // Hearing completion state
  const [hearingNotes, setHearingNotes] = useState('');
  const [studentAttended, setStudentAttended] = useState(true);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Verdict form state
  const [outcome, setOutcome] = useState('');
  const [penalty, setPenalty] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [conditions, setConditions] = useState('');
  const [appealRights, setAppealRights] = useState('');
  const [verdictLoading, setVerdictLoading] = useState(false);

  const [actionError, setActionError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/cases/${id}`),
      api.get(`/cases/${id}/audit`),
    ])
      .then(([c, audit]) => { setCaseData(c); setAuditLog(audit); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function scheduleHearing(e) {
    e.preventDefault();
    setActionError('');
    setHearingLoading(true);
    try {
      await api.post(`/cases/${id}/hearings`, { scheduledAt, venue });
      window.location.reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setHearingLoading(false);
    }
  }

  async function completeHearing() {
    setActionError('');
    setCompleteLoading(true);
    try {
      await api.patch(`/cases/${id}/hearings/${caseData.hearing.id}`, {
        studentAttended,
        hearingNotes,
      });
      window.location.reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCompleteLoading(false);
    }
  }

  async function recordVerdict(e) {
    e.preventDefault();
    setActionError('');
    setVerdictLoading(true);
    try {
      await api.post(`/cases/${id}/verdict`, {
        outcome, penalty, effectiveDate, conditions, appealRights,
      });
      window.location.reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setVerdictLoading(false);
    }
  }

  if (loading) return <CommitteeLayout><p className="text-sm text-gray-400">Loading…</p></CommitteeLayout>;
  if (!caseData) return <CommitteeLayout><p className="text-red-600">Case not found.</p></CommitteeLayout>;

  const canConstitute = ['response_received', 'response_overdue'].includes(caseData.current_stage)
    && !caseData.panel
    && user.role !== 'panel_member';

  const canSchedule = caseData.current_stage === 'panel_constituted' && !caseData.hearing;
  const canComplete = caseData.current_stage === 'hearing_scheduled' && caseData.hearing && !caseData.hearing.completed_at;
  const canVerdict = caseData.current_stage === 'hearing_completed' && !caseData.verdict;

  return (
    <CommitteeLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/committee" className="text-sm text-brand hover:underline">← Dashboard</Link>
          <StageBadge stage={caseData.current_stage} />
        </div>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-xs font-mono text-gray-400">{caseData.reference}</p>
          <h2 className="text-lg font-bold text-gray-900 mt-1 mb-4">Case File</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Detail label="Student" value={`${caseData.student_name} (${caseData.matric_number})`} />
            <Detail label="Faculty" value={caseData.faculty_name || '—'} />
            <Detail label="Level" value={caseData.level || '—'} />
            <Detail label="Filed by" value={caseData.filed_by_name} />
            <Detail label="Filed" value={new Date(caseData.filed_at).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
            {caseData.incident_date && (
              <Detail label="Incident date" value={new Date(caseData.incident_date).toLocaleDateString('en-GB')} />
            )}
            {caseData.incident_location && (
              <Detail label="Location" value={caseData.incident_location} />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {[
            { key: 'case', label: 'Case details' },
            { key: 'response', label: 'Student response' },
            { key: 'panel', label: 'Panel & hearing' },
            { key: 'verdict', label: 'Verdict' },
            { key: 'audit', label: 'Audit trail' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* Case details tab */}
        {activeTab === 'case' && (
          <div className="space-y-4">
            <Section title="Alleged offence">
              <p className="text-sm text-gray-800">{caseData.offence_description}</p>
            </Section>
            {caseData.regulation_breached && (
              <Section title="Regulation alleged to have been breached">
                <p className="text-sm text-gray-800">{caseData.regulation_breached}</p>
              </Section>
            )}
            {caseData.evidence?.length > 0 && (
              <Section title={`Evidence filed by complaints officer (${caseData.evidence.length} file${caseData.evidence.length !== 1 ? 's' : ''})`}>
                <ul className="space-y-1">
                  {caseData.evidence.map(f => (
                    <li key={f.id} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-gray-400">📎</span>
                      {f.file_name}
                      <span className="text-xs text-gray-400">({Math.round(f.file_size / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {canConstitute && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-purple-800 font-medium">
                  Ready to constitute a panel for this case.
                </p>
                <Link
                  to={`/committee/cases/${id}/panel`}
                  className="bg-brand text-white text-sm px-4 py-2 rounded-lg font-medium"
                >
                  Constitute Panel
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Student response tab */}
        {activeTab === 'response' && (
          <div>
            {!caseData.studentResponse ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                {['awaiting_response'].includes(caseData.current_stage)
                  ? `Awaiting student response. Deadline: ${caseData.response_deadline ? new Date(caseData.response_deadline).toLocaleDateString('en-GB', { dateStyle: 'long' }) : '—'}`
                  : 'No response was submitted.'}
              </div>
            ) : (
              <Section title={`Student's response — ${caseData.studentResponse.plea === 'admit' ? 'ADMITTED' : 'DENIED'}`}>
                <p className={`text-xs font-semibold mb-2 ${caseData.studentResponse.plea === 'admit' ? 'text-red-600' : 'text-green-700'}`}>
                  {caseData.studentResponse.plea === 'admit'
                    ? 'The student admitted the alleged offence.'
                    : 'The student denied the alleged offence.'}
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{caseData.studentResponse.response_text}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Submitted {new Date(caseData.studentResponse.submitted_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                </p>
              </Section>
            )}
          </div>
        )}

        {/* Panel & hearing tab */}
        {activeTab === 'panel' && (
          <div className="space-y-4">
            {caseData.panel ? (
              <Section title="Panel composition">
                <ul className="space-y-2">
                  {caseData.panel.members?.map(m => (
                    <li key={m.userId} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-500 capitalize">{m.panelRole}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                  Constituted {new Date(caseData.panel.constituted_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                </p>
              </Section>
            ) : (
              <p className="text-sm text-gray-500">No panel constituted yet.</p>
            )}

            {canSchedule && (
              <Section title="Schedule hearing">
                <form onSubmit={scheduleHearing} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date & time</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Venue</label>
                      <input
                        type="text"
                        required
                        value={venue}
                        onChange={e => setVenue(e.target.value)}
                        placeholder="e.g. Senate Chamber, Room 101"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={hearingLoading}
                    className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {hearingLoading ? 'Scheduling…' : 'Schedule & Send Appearance Notice'}
                  </button>
                </form>
              </Section>
            )}

            {caseData.hearing && (
              <Section title="Hearing">
                <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <Detail label="Date & time" value={new Date(caseData.hearing.scheduled_at).toLocaleString('en-GB')} />
                  <Detail label="Venue" value={caseData.hearing.venue} />
                  {caseData.hearing.student_attended !== null && (
                    <Detail label="Student attended" value={caseData.hearing.student_attended ? 'Yes' : 'No'} />
                  )}
                </dl>

                {canComplete && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Record hearing outcome</p>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentAttended}
                          onChange={e => setStudentAttended(e.target.checked)}
                          className="rounded"
                        />
                        Student attended
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Hearing notes (secretary's record)</label>
                      <textarea
                        rows={4}
                        value={hearingNotes}
                        onChange={e => setHearingNotes(e.target.value)}
                        placeholder="Record proceedings, key submissions, panel deliberation…"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <button
                      onClick={completeHearing}
                      disabled={completeLoading}
                      className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {completeLoading ? 'Saving…' : 'Save Hearing Record'}
                    </button>
                  </div>
                )}

                {caseData.hearing.hearing_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Hearing notes</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{caseData.hearing.hearing_notes}</p>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}

        {/* Verdict tab */}
        {activeTab === 'verdict' && (
          <div>
            {caseData.verdict ? (
              <Section title="Verdict">
                <p className={`text-lg font-bold mb-3 ${
                  caseData.verdict.outcome === 'dismissed' ? 'text-green-700' : 'text-red-700'
                }`}>
                  Complaint {caseData.verdict.outcome.toUpperCase()}
                </p>
                {caseData.verdict.penalty && (
                  <p className="text-sm text-gray-800 mb-2"><strong>Penalty:</strong> {caseData.verdict.penalty}</p>
                )}
                {caseData.verdict.conditions && (
                  <p className="text-sm text-gray-800 mb-2"><strong>Conditions:</strong> {caseData.verdict.conditions}</p>
                )}
                {caseData.verdict.appeal_rights && (
                  <p className="text-sm text-gray-800"><strong>Appeal rights:</strong> {caseData.verdict.appeal_rights}</p>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Recorded {new Date(caseData.verdict.recorded_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                  {caseData.verdict.communicated_at && (
                    <> · Communicated to student {new Date(caseData.verdict.communicated_at).toLocaleDateString('en-GB')}</>
                  )}
                </p>
              </Section>
            ) : canVerdict ? (
              <Section title="Record verdict">
                <form onSubmit={recordVerdict} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Outcome</label>
                    <div className="flex gap-3">
                      {['upheld', 'dismissed', 'referred'].map(o => (
                        <label key={o} className={`flex-1 flex items-center justify-center gap-2 border rounded-lg p-3 cursor-pointer text-sm font-medium transition-colors
                          ${outcome === o
                            ? o === 'dismissed' ? 'bg-green-50 border-green-400 text-green-800'
                              : o === 'upheld' ? 'bg-red-50 border-red-400 text-red-800'
                              : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                          <input type="radio" name="outcome" value={o} checked={outcome === o}
                            onChange={() => setOutcome(o)} className="sr-only" />
                          {o.charAt(0).toUpperCase() + o.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {outcome === 'upheld' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Penalty imposed</label>
                        <input
                          type="text"
                          value={penalty}
                          onChange={e => setPenalty(e.target.value)}
                          placeholder="e.g. Suspension for one academic semester"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Effective date</label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={e => setEffectiveDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conditions attached</label>
                        <textarea rows={2} value={conditions} onChange={e => setConditions(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Right of appeal</label>
                    <input
                      type="text"
                      value={appealRights}
                      onChange={e => setAppealRights(e.target.value)}
                      placeholder="e.g. The student may appeal within 14 days to the Vice-Chancellor's office."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verdictLoading || !outcome}
                    className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {verdictLoading ? 'Recording…' : 'Record Verdict & Notify Student'}
                  </button>
                </form>
              </Section>
            ) : (
              <p className="text-sm text-gray-500">Verdict not yet recorded. Complete the hearing first.</p>
            )}
          </div>
        )}

        {/* Audit trail tab */}
        {activeTab === 'audit' && (
          <div className="space-y-2">
            {auditLog.length === 0 && <p className="text-sm text-gray-500">No audit entries.</p>}
            {auditLog.map(entry => (
              <div key={entry.id} className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono font-semibold text-gray-800">{entry.action}</span>
                    {entry.actor_name && (
                      <span className="text-gray-500"> — {entry.actor_name} ({entry.actor_role})</span>
                    )}
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <p className="text-gray-400 mt-0.5">{JSON.stringify(entry.metadata)}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-gray-400">
                    {new Date(entry.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CommitteeLayout>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 font-medium uppercase">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
