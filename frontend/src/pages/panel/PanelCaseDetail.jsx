import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const TABS = [
  { key: 'info',     label: 'Case Info' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'response', label: 'Student Response' },
  { key: 'verdict',  label: 'Verdict' },
];

export default function PanelCaseDetail({ caseId }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [actionError, setActionError] = useState('');

  // Hearing scheduling
  const [scheduledAt, setScheduledAt] = useState('');
  const [venue, setVenue] = useState('');
  const [hearingLoading, setHearingLoading] = useState(false);

  // Hearing completion
  const [studentAttended, setStudentAttended] = useState(true);
  const [hearingNotes, setHearingNotes] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // Verdict
  const [outcome, setOutcome] = useState('');
  const [penalty, setPenalty] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [conditions, setConditions] = useState('');
  const [appealRights, setAppealRights] = useState('');
  const [verdictLoading, setVerdictLoading] = useState(false);

  async function refresh() {
    try {
      const updated = await api.get(`/cases/${caseId}`);
      setCaseData(updated);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    api.get(`/cases/${caseId}`)
      .then(setCaseData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseId]);

  async function scheduleHearing(e) {
    e.preventDefault();
    setActionError('');
    setHearingLoading(true);
    try {
      await api.post(`/cases/${caseId}/hearings`, { scheduledAt, venue });
      await refresh();
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
      await api.patch(`/cases/${caseId}/hearings/${caseData.hearing.id}`, {
        studentAttended,
        hearingNotes,
      });
      await refresh();
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
      await api.post(`/cases/${caseId}/verdict`, {
        outcome, penalty, effectiveDate, conditions, appealRights,
      });
      await refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setVerdictLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-stone-400">Loading case…</p>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-red-500">Failed to load case details.</p>
      </div>
    );
  }

  const canSchedule = caseData.current_stage === 'panel_constituted' && !caseData.hearing;
  const canComplete = caseData.current_stage === 'hearing_scheduled'
    && caseData.hearing
    && !caseData.hearing.completed_at;
  const canVerdict = caseData.current_stage === 'hearing_completed' && !caseData.verdict;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">

      {/* Case header strip */}
      <div className="px-5 py-4 bg-gradient-to-r from-brand-50 to-stone-50 border-b border-stone-200 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-stone-400 mb-0.5">{caseData.reference}</p>
          <p className="font-semibold text-stone-900 font-serif">{caseData.student_name}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {caseData.matric_number}
            {caseData.faculty_name && ` · ${caseData.faculty_name}`}
            {caseData.level && ` · ${caseData.level}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-stone-400">Filed by</p>
          <p className="text-xs font-medium text-stone-700">{caseData.filed_by_name}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {new Date(caseData.filed_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-stone-200 bg-stone-50">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? 'border-brand text-brand bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {actionError}
          </div>
        )}

        {/* ─── Case Info ─────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-5">

            {/* Offence */}
            <Field label="Alleged Offence">
              <p className="text-sm text-stone-800 leading-relaxed">{caseData.offence_description}</p>
            </Field>

            {caseData.regulation_breached && (
              <Field label="Regulation Breached">
                <p className="text-sm text-stone-800">{caseData.regulation_breached}</p>
              </Field>
            )}

            {(caseData.incident_location || caseData.incident_date) && (
              <div className="grid grid-cols-2 gap-4">
                {caseData.incident_location && (
                  <Field label="Location">
                    <p className="text-sm text-stone-800">{caseData.incident_location}</p>
                  </Field>
                )}
                {caseData.incident_date && (
                  <Field label="Incident Date">
                    <p className="text-sm text-stone-800">
                      {new Date(caseData.incident_date).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                    </p>
                  </Field>
                )}
              </div>
            )}

            {/* Panel composition */}
            {caseData.panel && (
              <div className="border-t border-stone-100 pt-4">
                <Field label="Panel Composition">
                  <ul className="space-y-1.5 mt-1">
                    {caseData.panel.members?.map(m => (
                      <li key={m.userId} className="flex items-center justify-between text-sm">
                        <span className="text-stone-800">{m.name}</span>
                        <span className="text-xs capitalize text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                          {m.panelRole}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-stone-400 mt-2">
                    Constituted {new Date(caseData.panel.constituted_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                  </p>
                </Field>
              </div>
            )}

            {/* Schedule hearing form */}
            {canSchedule && (
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">Schedule Hearing</p>
                <form onSubmit={scheduleHearing} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Date & time</label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Venue</label>
                      <input
                        type="text"
                        required
                        value={venue}
                        onChange={e => setVenue(e.target.value)}
                        placeholder="e.g. Senate Chamber"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={hearingLoading}
                    className="bg-brand text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-brand-600 transition-colors"
                  >
                    {hearingLoading ? 'Scheduling…' : 'Schedule & Send Appearance Notice'}
                  </button>
                </form>
              </div>
            )}

            {/* Hearing details */}
            {caseData.hearing && (
              <div className="border-t border-stone-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Hearing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Date & time</p>
                    <p className="text-sm text-stone-800">
                      {new Date(caseData.hearing.scheduled_at).toLocaleString('en-GB', {
                        dateStyle: 'medium', timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Venue</p>
                    <p className="text-sm text-stone-800">{caseData.hearing.venue}</p>
                  </div>
                  {caseData.hearing.student_attended !== null && (
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Student attended</p>
                      <p className={`text-sm font-medium ${caseData.hearing.student_attended ? 'text-green-700' : 'text-red-600'}`}>
                        {caseData.hearing.student_attended ? 'Yes' : 'No'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Record hearing outcome */}
                {canComplete && (
                  <div className="border-t border-stone-100 pt-3 space-y-3">
                    <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Record Outcome</p>
                    <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={studentAttended}
                        onChange={e => setStudentAttended(e.target.checked)}
                        className="rounded border-stone-300 text-brand focus:ring-brand"
                      />
                      Student attended the hearing
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Hearing notes</label>
                      <textarea
                        rows={4}
                        value={hearingNotes}
                        onChange={e => setHearingNotes(e.target.value)}
                        placeholder="Record proceedings, key submissions, and panel deliberation…"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                      />
                    </div>
                    <button
                      onClick={completeHearing}
                      disabled={completeLoading}
                      className="bg-brand text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-brand-600 transition-colors"
                    >
                      {completeLoading ? 'Saving…' : 'Save Hearing Record'}
                    </button>
                  </div>
                )}

                {caseData.hearing.hearing_notes && (
                  <div className="bg-stone-50 rounded-lg p-3">
                    <p className="text-xs text-stone-400 mb-1">Hearing notes on record</p>
                    <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                      {caseData.hearing.hearing_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Evidence ──────────────────────────────────────── */}
        {activeTab === 'evidence' && (
          <div>
            {!caseData.evidence?.length ? (
              <div className="py-8 text-center">
                <p className="text-sm text-stone-400">No evidence files attached to this case.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {caseData.evidence.map(f => (
                  <li key={f.id} className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg bg-stone-50">
                    <div className="w-9 h-9 bg-stone-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-500 text-sm">
                        {f.mime_type?.includes('pdf') ? '📄' : f.mime_type?.includes('image') ? '🖼' : '📎'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{f.file_name}</p>
                      <p className="text-xs text-stone-400">
                        {f.file_size ? `${Math.round(f.file_size / 1024)} KB` : '—'}
                        {f.uploaded_at && ` · Uploaded ${new Date(f.uploaded_at).toLocaleDateString('en-GB')}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ─── Student Response ──────────────────────────────── */}
        {activeTab === 'response' && (
          <div>
            {!caseData.studentResponse ? (
              <div className="py-8 text-center">
                <p className="text-sm text-stone-400">
                  {['awaiting_response', 'student_notified'].includes(caseData.current_stage)
                    ? `Awaiting student response. Deadline: ${
                        caseData.response_deadline
                          ? new Date(caseData.response_deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })
                          : '—'
                      }`
                    : 'No response was submitted by the student.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  caseData.studentResponse.plea === 'admit'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {caseData.studentResponse.plea === 'admit'
                    ? 'Student admitted the alleged offence'
                    : 'Student denied the alleged offence'}
                </div>

                <Field label="Written Response">
                  <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed mt-1">
                    {caseData.studentResponse.response_text}
                  </p>
                </Field>

                <p className="text-xs text-stone-400">
                  Submitted{' '}
                  {new Date(caseData.studentResponse.submitted_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── Verdict ───────────────────────────────────────── */}
        {activeTab === 'verdict' && (
          <div>
            {caseData.verdict ? (
              <div className="space-y-4">
                <div className={`text-xl font-bold font-serif ${
                  caseData.verdict.outcome === 'dismissed' ? 'text-green-700'
                  : caseData.verdict.outcome === 'upheld'  ? 'text-red-700'
                  : 'text-amber-700'
                }`}>
                  Complaint {caseData.verdict.outcome.toUpperCase()}
                </div>

                {caseData.verdict.penalty && (
                  <Field label="Penalty Imposed">
                    <p className="text-sm text-stone-800">{caseData.verdict.penalty}</p>
                  </Field>
                )}
                {caseData.verdict.conditions && (
                  <Field label="Conditions">
                    <p className="text-sm text-stone-800">{caseData.verdict.conditions}</p>
                  </Field>
                )}
                {caseData.verdict.appeal_rights && (
                  <Field label="Right of Appeal">
                    <p className="text-sm text-stone-800">{caseData.verdict.appeal_rights}</p>
                  </Field>
                )}
                <p className="text-xs text-stone-400">
                  Recorded {new Date(caseData.verdict.recorded_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                  {caseData.verdict.communicated_at && (
                    <> · Communicated {new Date(caseData.verdict.communicated_at).toLocaleDateString('en-GB')}</>
                  )}
                </p>
              </div>

            ) : canVerdict ? (
              <form onSubmit={recordVerdict} className="space-y-4">
                {/* Outcome selector */}
                <div>
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">Outcome</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'upheld',    label: 'Upheld',    bg: 'bg-red-50 border-red-300 text-red-800' },
                      { value: 'dismissed', label: 'Dismissed', bg: 'bg-green-50 border-green-300 text-green-800' },
                      { value: 'referred',  label: 'Referred',  bg: 'bg-amber-50 border-amber-300 text-amber-800' },
                    ].map(o => (
                      <label
                        key={o.value}
                        className={`flex items-center justify-center border rounded-lg p-2.5 cursor-pointer text-xs font-medium transition-colors ${
                          outcome === o.value ? o.bg : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="outcome"
                          value={o.value}
                          checked={outcome === o.value}
                          onChange={() => setOutcome(o.value)}
                          className="sr-only"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                {outcome === 'upheld' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Penalty imposed</label>
                      <input
                        type="text"
                        value={penalty}
                        onChange={e => setPenalty(e.target.value)}
                        placeholder="e.g. Suspension for one academic semester"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Effective date</label>
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={e => setEffectiveDate(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Conditions attached</label>
                      <textarea
                        rows={2}
                        value={conditions}
                        onChange={e => setConditions(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Right of appeal</label>
                  <input
                    type="text"
                    value={appealRights}
                    onChange={e => setAppealRights(e.target.value)}
                    placeholder="e.g. The student may appeal within 14 days to the Vice-Chancellor."
                    className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verdictLoading || !outcome}
                  className="w-full bg-brand text-white py-2.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-brand-600 transition-colors"
                >
                  {verdictLoading ? 'Recording…' : 'Record Verdict & Notify Student'}
                </button>
              </form>

            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-stone-400">
                  Verdict not yet recorded. Complete the hearing first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}
