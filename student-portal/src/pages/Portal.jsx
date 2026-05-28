import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import api from '../utils/api';
import { fmt, daysUntil } from '../utils/formatters';

function statusPill(status) {
  const map = {
    AWAITING_RESPONSE:  { label: 'Response Required', cls: 'pill-amber' },
    STUDENT_NOTIFIED:   { label: 'Response Required', cls: 'pill-amber' },
    RESPONSE_RECEIVED:  { label: 'Response Submitted', cls: 'pill-green' },
    RESPONSE_OVERDUE:   { label: 'Deadline Passed',   cls: 'pill-red' },
    PANEL_CONSTITUTED:  { label: 'Under Review',       cls: 'pill-blue' },
    HEARING_SCHEDULED:  { label: 'Hearing Scheduled',  cls: 'pill-blue' },
    HEARING_COMPLETE:   { label: 'Hearing Complete',   cls: 'pill-blue' },
    VERDICT_DELIVERED:  { label: 'Closed',             cls: 'pill-grey' },
    CLOSED:             { label: 'Closed',             cls: 'pill-grey' },
  };
  return map[status] || { label: status, cls: 'pill-grey' };
}

export default function Portal() {
  const { student, institution, logout } = useStudentAuth();
  const navigate = useNavigate();
  const [cases, setCases]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cases')
      .then(setCases)
      .catch(err => {
        if (err?.error?.includes('expired') || err?.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, []);

  // Single case — go straight to detail
  useEffect(() => {
    if (!loading && cases.length === 1) {
      navigate(`/portal/case/${cases[0].id}`, { replace: true });
    }
  }, [loading, cases]);

  return (
    <div>
      <nav className="topbar">
        <span className="topbar-title">
          {institution?.shortName || institution?.name || 'Disciplinary Portal'}
        </span>
        <div className="topbar-student">
          <div style={{ fontWeight: 600, color: '#fff' }}>{student?.firstName} {student?.lastName}</div>
          <div style={{ fontSize: 12 }}>{student?.matricNumber}</div>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: 32 }}>
        <h1 className="font-serif" style={{ fontSize: 28, marginBottom: 6, color: 'var(--text)' }}>
          Your Cases
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>
          The following disciplinary matter{cases.length !== 1 ? 's' : ''} {cases.length !== 1 ? 'have' : 'has'} been filed against you.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : cases.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--muted)' }}>No cases found.</p>
          </div>
        ) : (
          <div>
            {cases.map(c => {
              const pill   = statusPill(c.status);
              const days   = daysUntil(c.responseDeadline);
              const urgent = ['AWAITING_RESPONSE', 'STUDENT_NOTIFIED'].includes(c.status) && days !== null && days <= 2;
              return (
                <div
                  key={c.id}
                  className="card"
                  style={{ marginBottom: 16, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => navigate(`/portal/case/${c.id}`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--maroon)' }}>{c.referenceNumber}</span>
                    <span className={`pill ${pill.cls}`}>{pill.label}</span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <p className="section-label" style={{ marginBottom: 6 }}>Offences Alleged</p>
                    {c.offences?.map(o => (
                      <p key={o.id} style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 2 }}>
                        • {o.offenceType?.name}
                      </p>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
                    <span>Filed: {fmt(c.filedAt)}</span>
                    {c.responseDeadline && ['AWAITING_RESPONSE', 'STUDENT_NOTIFIED'].includes(c.status) && (
                      <span style={{ color: urgent ? 'var(--status-danger)' : 'var(--text-mid)', fontWeight: urgent ? 600 : 400 }}>
                        {urgent ? '⏰ ' : ''}Deadline: {fmt(c.responseDeadline)}
                        {days !== null && days >= 0 && ` (${days} day${days !== 1 ? 's' : ''})`}
                      </span>
                    )}
                    {c.studentResponseAt && (
                      <span style={{ color: 'var(--status-ok)' }}>✓ Response submitted</span>
                    )}
                  </div>

                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <span style={{ fontSize: 13, color: 'var(--maroon)', fontWeight: 600 }}>View this case →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
