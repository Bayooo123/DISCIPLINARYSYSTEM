import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fmt, fmtDt } from '../utils/formatters';

export default function Submitted() {
  const { state } = useLocation();
  const { plea, submittedAt, referenceNumber, deadline, locked } = state || {};

  return (
    <div className="center-page">
      <div style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h1 className="font-serif" style={{ fontSize: 28, marginBottom: 8, color: 'var(--text)' }}>
          Your response has been received.
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 14 }}>
          A confirmation email has been sent to your registered email address.
        </p>

        <div style={{ background: 'var(--status-ok-bg)', border: '1px solid #A8D5B8', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left' }}>
          {referenceNumber && <Row label="Case Reference" value={<span className="font-mono">{referenceNumber}</span>} />}
          {submittedAt     && <Row label="Submitted"      value={fmtDt(submittedAt)} />}
          {plea            && <Row label="Plea"           value={plea === 'GUILTY' ? 'Guilty' : 'Not Guilty'} />}
        </div>

        <div style={{ background: 'var(--page-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 32, textAlign: 'left' }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--text)' }}>What happens next</p>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
            The Disciplinary Committee will review your submission and appoint a panel to hear your case.
            You will receive a formal hearing notice by email once a date has been set.
          </p>
          {!locked && deadline && (
            <p style={{ fontSize: 13, color: 'var(--status-new)', marginTop: 12 }}>
              You may still update your response once before {fmt(deadline)}.
            </p>
          )}
          {locked && (
            <p style={{ fontSize: 13, color: 'var(--status-ok)', marginTop: 12, fontWeight: 600 }}>
              Your response is now final and cannot be changed.
            </p>
          )}
        </div>

        <Link to="/portal" className="btn btn-secondary btn-full" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
          ← Return to My Case
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
      <span style={{ color: 'var(--muted)', fontSize: 13, width: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
