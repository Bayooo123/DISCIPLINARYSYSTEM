import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import api from '../utils/api';
import { fmt, fmtDt, fmtDay, fmtTime, daysUntil } from '../utils/formatters';

const PROGRESS_STAGES = [
  { key: 'filed',    label: 'Complaint Filed',  statuses: ['COMPLAINT_FILED', 'STUDENT_NOTIFIED'] },
  { key: 'response', label: 'Your Response',    statuses: ['AWAITING_RESPONSE', 'RESPONSE_RECEIVED', 'RESPONSE_OVERDUE'] },
  { key: 'hearing',  label: 'Hearing',          statuses: ['PANEL_CONSTITUTED', 'HEARING_SCHEDULED', 'HEARING_COMPLETE'] },
  { key: 'outcome',  label: 'Outcome',          statuses: ['VERDICT_DELIVERED', 'CLOSED'] },
];

function getStageIndex(status) {
  for (let i = 0; i < PROGRESS_STAGES.length; i++) {
    if (PROGRESS_STAGES[i].statuses.includes(status)) return i;
  }
  return 0;
}

function FileSizeLabel({ bytes }) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { student, institution, logout } = useStudentAuth();

  const [c, setC]                   = useState(null);
  const [evidence, setEvidence]     = useState({ complainant: [], student: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Response form
  const [plea, setPlea]             = useState('');
  const [statement, setStatement]   = useState('');
  const [files, setFiles]           = useState([]);
  const [confirmed1, setConfirmed1] = useState(false);
  const [confirmed2, setConfirmed2] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing]       = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([api.get(`/cases/${id}`), api.get(`/cases/${id}/evidence`)])
      .then(([caseData, evData]) => { setC(caseData); setEvidence(evData); })
      .catch(err => {
        if (err?.error?.includes('expired') || err?.status === 401) logout();
        else setError('This case could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('plea', plea);
      fd.append('statement', statement);
      files.forEach(f => fd.append('evidence', f));
      const updated = await api.post(`/cases/${id}/response`, fd);
      setC(updated);
      setEditing(false);
      setShowConfirm(false);
      setPlea(''); setStatement(''); setFiles([]);
      navigate(`/portal/case/${id}/submitted`, { state: { plea, submittedAt: updated.studentResponseAt, referenceNumber: c.referenceNumber, deadline: c.responseDeadline, locked: updated.studentResponseLocked } });
    } catch (err) {
      setError(err?.error || 'Failed to submit. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit() {
    setPlea(c.plea || '');
    setStatement(c.studentResponse || '');
    setEditing(true);
    setShowConfirm(false);
    setConfirmed1(false); setConfirmed2(false);
  }

  if (loading) return (
    <div className="center-page"><div className="spinner" /></div>
  );
  if (error && !c) return (
    <div className="center-page">
      <p style={{ color: 'var(--status-danger)' }}>{error}</p>
      <Link to="/portal" style={{ color: 'var(--maroon)', fontSize: 14, marginTop: 12 }}>← Back to portal</Link>
    </div>
  );

  const stageIdx   = getStageIndex(c.status);
  const days       = daysUntil(c.responseDeadline);
  const isOverdue  = days !== null && days < 0;
  const needsResp  = ['AWAITING_RESPONSE', 'STUDENT_NOTIFIED'].includes(c.status);
  const hasResp    = !!c.studentResponse;
  const canEdit    = hasResp && !c.studentResponseLocked && needsResp && !isOverdue;
  const showForm   = (needsResp && !hasResp && !isOverdue) || editing;
  const locked     = c.studentResponseLocked;

  return (
    <div>
      <nav className="topbar">
        <Link to="/portal" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', marginRight: 8 }}>← All Cases</Link>
        <span className="topbar-title">{c.referenceNumber}</span>
        <div className="topbar-student">
          <div style={{ fontWeight: 600, color: '#fff' }}>{student?.firstName} {student?.lastName}</div>
          <div style={{ fontSize: 12 }}>{student?.matricNumber}</div>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: 32 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 4 }}>
            Case {c.referenceNumber}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Filed against you on {fmt(c.filedAt)}</p>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="progress-steps">
            {PROGRESS_STAGES.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="step-item">
                  <div className={`step-dot ${i < stageIdx ? 'done' : i === stageIdx ? 'active' : ''}`}>
                    {i < stageIdx ? '✓' : i + 1}
                  </div>
                  <span className={`step-label ${i === stageIdx ? 'active' : ''}`}>{s.label}</span>
                </div>
                {i < PROGRESS_STAGES.length - 1 && (
                  <div className={`step-line ${i < stageIdx ? 'done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Deadline banner */}
        {needsResp && (
          <div className={`deadline-banner ${isOverdue ? 'red' : days <= 1 ? 'red' : 'amber'}`}>
            <span style={{ fontSize: 20 }}>{isOverdue ? '⛔' : '⏰'}</span>
            <div>
              {isOverdue
                ? <strong>The response deadline passed on {fmt(c.responseDeadline)}.</strong>
                : <><strong>You must respond by {fmt(c.responseDeadline)}</strong> — {days} day{days !== 1 ? 's' : ''} remaining</>
              }
            </div>
          </div>
        )}

        {/* SECTION A — The Complaint */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="section-label">The Complaint Against You</p>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20, lineHeight: 1.8 }}>
            A formal disciplinary complaint has been filed against you by the {c.originType?.toLowerCase() === 'faculty' ? 'Faculty' : c.originType?.toLowerCase() === 'hostel' ? 'Hostel Administration' : 'University'}.
            You have the right to respond and present your own evidence before any decision is made.
          </p>

          <div style={{ marginBottom: 20 }}>
            <Row label="Incident Date"  value={fmt(c.incidentDate)} />
            {c.incidentLocation && <Row label="Location"      value={c.incidentLocation} />}
            {c.courseCode       && <Row label="Course"        value={`${c.courseCode}${c.courseTitle ? ` — ${c.courseTitle}` : ''}`} />}
            {c.witnessName      && <Row label="Witness"       value={c.witnessName} />}
          </div>

          <p className="section-label" style={{ marginBottom: 8 }}>Offences Alleged</p>
          {c.offences?.map(o => (
            <p key={o.id} style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 4 }}>• {o.offenceType?.name}</p>
          ))}

          <hr className="divider" />

          <p className="section-label" style={{ marginBottom: 8 }}>Particulars of the Complaint</p>
          <blockquote style={{
            borderLeft: '3px solid var(--border)', paddingLeft: 16,
            color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.8, fontStyle: 'italic',
          }}>
            {c.description}
          </blockquote>

          {evidence.complainant.length > 0 && (
            <>
              <hr className="divider" />
              <p className="section-label" style={{ marginBottom: 8 }}>Evidence on File</p>
              {evidence.complainant.map(e => (
                <div key={e.id} className="file-item">
                  <span className="file-icon">📄</span>
                  <div>
                    <div className="file-name">{e.fileName}</div>
                    <div className="file-meta">{e.fileType} · <FileSizeLabel bytes={e.fileSize} /></div>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                These files are held by the Disciplinary Committee and will be available to the panel at your hearing.
              </p>
            </>
          )}
        </div>

        {/* SECTION B — Response */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="section-label">Your Response</p>

          {/* Locked — show submitted response read-only */}
          {hasResp && !editing && (
            <div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 13, padding: '3px 10px', borderRadius: 999,
                  background: c.plea === 'GUILTY' ? 'var(--status-danger-bg)' : 'var(--status-ok-bg)',
                  color: c.plea === 'GUILTY' ? 'var(--status-danger)' : 'var(--status-ok)',
                  fontWeight: 600,
                }}>
                  Plea: {c.plea === 'GUILTY' ? 'Guilty' : 'Not Guilty'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Submitted {fmtDt(c.studentResponseAt)}</span>
                {locked && <span style={{ fontSize: 12, color: 'var(--status-ok)', fontWeight: 600 }}>✓ Final</span>}
              </div>
              <div style={{ background: 'var(--page-bg)', borderRadius: 10, padding: 16, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8, marginBottom: 16 }}>
                {c.studentResponse}
              </div>

              {evidence.student.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Your evidence:</p>
                  {evidence.student.map(e => (
                    <div key={e.id} className="file-item">
                      <span className="file-icon">📎</span>
                      <div style={{ flex: 1 }}>
                        <div className="file-name">{e.fileName}</div>
                        <div className="file-meta"><FileSizeLabel bytes={e.fileSize} /></div>
                      </div>
                      {e.fileUrl && (
                        <a href={e.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--maroon)' }}>View</a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canEdit && (
                <div className="alert alert-amber" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ℹ You may update your response once before {fmt(c.responseDeadline)}. After one update, it is permanently locked.</span>
                  <button className="btn btn-secondary" style={{ marginLeft: 16, flexShrink: 0, padding: '8px 16px', fontSize: 13 }} onClick={startEdit}>
                    Edit
                  </button>
                </div>
              )}

              {locked && (
                <div className="alert alert-green">
                  ✅ Your response is final and cannot be changed.
                </div>
              )}
            </div>
          )}

          {/* Overdue — no response */}
          {!hasResp && isOverdue && (
            <div className="alert alert-red">
              The deadline to submit your response has passed. Please contact the Disciplinary Committee directly.
            </div>
          )}

          {/* Response form */}
          {showForm && (
            <div>
              {editing && (
                <div className="alert alert-amber" style={{ marginBottom: 20 }}>
                  ⚠ You are editing your response. After saving, it will be permanently locked and cannot be changed again.
                </div>
              )}

              {error && <div className="alert alert-red" style={{ marginBottom: 16 }}>{error}</div>}

              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>Select Your Plea</p>
              <div className="plea-grid" style={{ marginBottom: 24 }}>
                {[
                  { value: 'GUILTY',     title: 'Guilty',     sub: 'I admit the allegation' },
                  { value: 'NOT_GUILTY', title: 'Not Guilty', sub: 'I deny the allegation' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`plea-card ${plea === opt.value ? 'selected' : ''}`}
                    onClick={() => setPlea(opt.value)}
                  >
                    <div className="plea-title">{opt.title}</div>
                    <div className="plea-sub">{opt.sub}</div>
                  </div>
                ))}
              </div>

              <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8, color: 'var(--text)' }}>
                Your Written Statement
              </label>
              <textarea
                className="input"
                rows={8}
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="Set out your response to the complaint. Explain what happened from your perspective, address the specific allegations, and include any context you feel is relevant. Be clear and factual."
              />
              <p style={{ fontSize: 12, color: statement.length < 30 ? 'var(--status-danger)' : 'var(--muted)', marginTop: 4, marginBottom: 20 }}>
                {statement.length} characters {statement.length < 30 ? `— minimum 30 required` : ''}
              </p>

              {/* Evidence upload */}
              <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8, color: 'var(--text)' }}>
                Supporting Evidence <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
              </label>
              <div
                style={{
                  border: '2px dashed var(--border)', borderRadius: 10, padding: 24,
                  textAlign: 'center', cursor: 'pointer', marginBottom: files.length ? 12 : 24,
                }}
                onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); const next = [...files]; for (const f of e.dataTransfer.files) { if (next.length < 5) next.push(f); } setFiles(next); }}
                onDragOver={e => e.preventDefault()}
              >
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>Drag files here or <span style={{ color: 'var(--maroon)', fontWeight: 600 }}>click to browse</span></p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>PDF, Word, images — max 10 MB each, up to 5 files</p>
                <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" style={{ display: 'none' }}
                  onChange={e => { const next = [...files]; for (const f of e.target.files) { if (next.length < 5) next.push(f); } setFiles(next); }} />
              </div>
              {files.map((f, i) => (
                <div key={i} className="file-item" style={{ marginBottom: 8 }}>
                  <span className="file-icon">📎</span>
                  <div style={{ flex: 1 }}>
                    <div className="file-name">{f.name}</div>
                    <div className="file-meta"><FileSizeLabel bytes={f.size} /></div>
                  </div>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}>✕</button>
                </div>
              ))}

              <button
                className="btn btn-primary btn-full"
                disabled={!plea || statement.trim().length < 30}
                onClick={() => { setShowConfirm(true); setConfirmed1(false); setConfirmed2(false); }}
                style={{ marginTop: 8 }}
              >
                {editing ? 'Save Updated Response' : 'Submit My Response'}
              </button>

              {editing && (
                <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Status when not yet responded and not overdue and no form */}
          {!hasResp && !needsResp && !isOverdue && (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your response will appear here once submitted.</p>
          )}
        </div>

        {/* SECTION C — Hearing */}
        {['PANEL_CONSTITUTED', 'HEARING_SCHEDULED', 'HEARING_COMPLETE', 'VERDICT_DELIVERED', 'CLOSED'].includes(c.status) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="section-label">Your Hearing</p>
            {c.status === 'PANEL_CONSTITUTED' ? (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>What happens next</p>
                <p style={{ color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.8 }}>
                  A disciplinary panel has been appointed to hear your case. A hearing date will be set shortly and you will
                  receive a formal notice by email with the date, time, and venue. There is nothing you need to do at this stage.
                </p>
              </div>
            ) : c.hearingDate ? (
              <div>
                <div style={{ background: 'var(--status-danger-bg)', border: '1px solid #D9A5A5', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, color: 'var(--maroon)', fontSize: 16, marginBottom: 12 }}>You are required to appear before the Disciplinary Panel.</p>
                  <Row label="Date"  value={fmtDay(c.hearingDate)} />
                  <Row label="Time"  value={fmtTime(c.hearingDate)} />
                  <Row label="Venue" value={c.hearingVenue || '—'} />
                  {c.panel?.name && <Row label="Panel" value={c.panel.name} />}
                </div>
                <p className="section-label" style={{ marginBottom: 8 }}>Charges</p>
                {c.offences?.map(o => <p key={o.id} style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 4 }}>• {o.offenceType?.name}</p>)}
                <hr className="divider" />
                <p className="section-label" style={{ marginBottom: 8 }}>Rules of Appearance</p>
                <ol style={{ paddingLeft: 20, fontSize: 14, color: 'var(--text-mid)', lineHeight: 2 }}>
                  <li>Arrive punctually. Failure to appear may result in the panel proceeding in your absence.</li>
                  <li>You may bring physical evidence that corresponds to materials already submitted digitally.</li>
                  <li>You will be given a full and fair opportunity to address the panel and present your case.</li>
                  <li>Legal counsel is not permitted unless expressly authorised in writing by the Committee.</li>
                  <li>Conduct yourself with decorum throughout the proceedings.</li>
                  <li>The verdict will be communicated within two (2) working days of the hearing.</li>
                </ol>
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION D — Verdict */}
        {['VERDICT_DELIVERED', 'CLOSED'].includes(c.status) && c.verdict && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="section-label">The Outcome</p>
            <div className={c.penalty ? 'verdict-upheld' : 'verdict-dismissed'} style={{ marginBottom: 16 }}>
              <Row label="Finding" value={c.penalty ? 'The allegation has been upheld.' : 'The allegation has been dismissed.'} />
              {c.penalty && <Row label="Penalty" value={c.penalty} />}
              <Row label="Date" value={fmt(c.verdictAt)} />
            </div>
            <p style={{ color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{c.verdict}</p>
            {c.penalty && (
              <div className="alert alert-amber">
                <strong>Your Right of Appeal:</strong> If you wish to appeal, submit a written notice of appeal to the Office of the Registrar
                within <strong>ten (10) working days</strong> of this notice.
                {c.institution?.contactEmail && <> Contact: <a href={`mailto:${c.institution.contactEmail}`} style={{ color: 'var(--maroon)' }}>{c.institution.contactEmail}</a></>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', padding: 32 }}>
            <h3 className="font-serif" style={{ fontSize: 20, marginBottom: 8 }}>Before you submit</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Please confirm the following before your response is recorded.</p>
            <label className="confirm-check">
              <input type="checkbox" checked={confirmed1} onChange={e => setConfirmed1(e.target.checked)} />
              <span>I have read the complaint against me carefully.</span>
            </label>
            <label className="confirm-check">
              <input type="checkbox" checked={confirmed2} onChange={e => setConfirmed2(e.target.checked)} />
              <span>My statement accurately represents my position and I understand I may edit it once before the deadline.</span>
            </label>
            {error && <div className="alert alert-red" style={{ marginTop: 16 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirm(false)} disabled={submitting}>Go Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!confirmed1 || !confirmed2 || submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting…' : 'Submit My Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
      <span style={{ color: 'var(--muted)', fontSize: 13, width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
