import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStudentAuth } from '../context/StudentAuthContext';

export default function AccessLink() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { login } = useStudentAuth();
  const [state, setState] = useState({ status: 'loading', error: null, info: null });

  useEffect(() => {
    if (!token) { setState({ status: 'invalid' }); return; }

    axios.post('/api/student/auth/validate-token', { token })
      .then(res => {
        login(res.data);
        navigate('/portal', { replace: true });
      })
      .catch(err => {
        const data = err.response?.data;
        if (err.response?.status === 410) {
          setState({ status: 'expired', info: data });
        } else if (err.response?.status === 404) {
          setState({ status: 'invalid' });
        } else {
          setState({ status: 'error', error: data?.error || 'Something went wrong.' });
        }
      });
  }, [token]);

  if (state.status === 'loading') return (
    <div className="center-page">
      <div className="spinner" style={{ marginBottom: 20 }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Verifying your access…</p>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Please wait while we confirm your identity.</p>
    </div>
  );

  if (state.status === 'expired') return (
    <div className="center-page">
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
        <h1 className="font-serif" style={{ fontSize: 26, marginBottom: 12, color: 'var(--text)' }}>This link has expired.</h1>
        <p style={{ color: 'var(--text-mid)', marginBottom: 16 }}>
          Access links are valid for 72 hours from the time the complaint was filed.
          If you need a new access link, please contact the Office of the Disciplinary Committee.
        </p>
        {state.info?.referenceNumber && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
            Case reference: <span className="font-mono">{state.info.referenceNumber}</span>
          </p>
        )}
        {state.info?.contactEmail && (
          <a href={`mailto:${state.info.contactEmail}`} style={{ color: 'var(--maroon)', fontSize: 14 }}>
            {state.info.contactEmail}
          </a>
        )}
      </div>
    </div>
  );

  if (state.status === 'invalid') return (
    <div className="center-page">
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 className="font-serif" style={{ fontSize: 26, marginBottom: 12, color: 'var(--text)' }}>This link is not valid.</h1>
        <p style={{ color: 'var(--text-mid)' }}>
          If you believe this is an error, please contact the Office of the Disciplinary Committee
          using the details in your original notification email.
        </p>
      </div>
    </div>
  );

  return (
    <div className="center-page">
      <p style={{ color: 'var(--status-danger)' }}>{state.error || 'An unexpected error occurred.'}</p>
    </div>
  );
}
