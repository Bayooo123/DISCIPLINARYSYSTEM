import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';
import StageBadge from '../../components/StageBadge';

export default function StudentCase() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/cases/${id}`)
      .then(setCaseData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><p className="text-sm text-gray-400">Loading…</p></Layout>;
  if (!caseData) return <Layout><p className="text-red-600">Case not found.</p></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/portal" className="text-sm text-brand hover:underline">← Back to portal</Link>

        {/* Case header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 font-mono">{caseData.reference}</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Disciplinary Case</h2>
            </div>
            <StageBadge stage={caseData.current_stage} />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Detail label="Filed by" value={caseData.filed_by_name} />
            <Detail label="Date filed" value={new Date(caseData.filed_at).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
            {caseData.incident_date && (
              <Detail label="Date of incident" value={new Date(caseData.incident_date).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
            )}
            {caseData.incident_location && (
              <Detail label="Location" value={caseData.incident_location} />
            )}
          </dl>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Alleged offence</p>
            <p className="text-sm text-gray-800">{caseData.offence_description}</p>
          </div>

          {caseData.regulation_breached && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">Regulation alleged to have been breached</p>
              <p className="text-sm text-gray-800">{caseData.regulation_breached}</p>
            </div>
          )}
        </div>

        {/* Evidence filed by officer */}
        {caseData.evidence?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Evidence Filed by Complaints Officer</h3>
            <ul className="space-y-2">
              {caseData.evidence.map(f => (
                <li key={f.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {f.file_name}
                  <span className="text-gray-400 text-xs">({Math.round(f.file_size / 1024)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Response section */}
        {caseData.current_stage === 'awaiting_response' && !caseData.studentResponse && (
          <ResponseForm caseId={id} deadline={caseData.response_deadline}
            onSubmitted={() => window.location.reload()} />
        )}

        {caseData.studentResponse && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Submitted Response</h3>
            <p className="text-xs text-gray-500 mb-2">
              Submitted {new Date(caseData.studentResponse.submitted_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
              {' '}—{' '}
              <span className={`font-semibold ${caseData.studentResponse.plea === 'admit' ? 'text-red-600' : 'text-green-700'}`}>
                {caseData.studentResponse.plea === 'admit' ? 'You admitted the offence' : 'You denied the offence'}
              </span>
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.studentResponse.response_text}</p>
          </div>
        )}

        {/* Panel & hearing details */}
        {caseData.hearing && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-indigo-800 mb-3">Hearing Notice</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Detail label="Date" value={new Date(caseData.hearing.scheduled_at).toLocaleDateString('en-GB', { dateStyle: 'long' })} />
              <Detail label="Time" value={new Date(caseData.hearing.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
              <Detail label="Venue" value={caseData.hearing.venue} />
            </dl>
          </div>
        )}

        {/* Verdict */}
        {caseData.verdict && (
          <div className={`border rounded-xl p-6 ${caseData.verdict.outcome === 'dismissed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${caseData.verdict.outcome === 'dismissed' ? 'text-green-800' : 'text-red-800'}`}>
              Panel Verdict
            </h3>
            <p className={`text-base font-bold mb-3 ${caseData.verdict.outcome === 'dismissed' ? 'text-green-900' : 'text-red-900'}`}>
              Complaint {caseData.verdict.outcome.toUpperCase()}
            </p>
            {caseData.verdict.penalty && (
              <p className="text-sm text-gray-800 mb-2"><strong>Penalty:</strong> {caseData.verdict.penalty}</p>
            )}
            {caseData.verdict.conditions && (
              <p className="text-sm text-gray-800 mb-2"><strong>Conditions:</strong> {caseData.verdict.conditions}</p>
            )}
            {caseData.verdict.appeal_rights && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600"><strong>Right of Appeal:</strong> {caseData.verdict.appeal_rights}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
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

function ResponseForm({ caseId, deadline, onSubmitted }) {
  const [plea, setPlea] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!plea) { setError('Please select a plea.'); return; }
    if (text.trim().length < 10) { setError('Your response must be at least 10 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('plea', plea);
      form.append('responseText', text);
      files.forEach(f => form.append('evidence', f));
      await api.postForm(`/cases/${caseId}/response`, form);
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-orange-800 mb-1">Response Required</h3>
      <p className="text-xs text-orange-700 mb-4">
        You must submit your response by{' '}
        <strong>{new Date(deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })}</strong>.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your plea</label>
          <div className="flex gap-3">
            {['admit', 'deny'].map(p => (
              <label key={p}
                className={`flex-1 flex items-center justify-center gap-2 border rounded-lg p-3 cursor-pointer text-sm font-medium transition-colors
                  ${plea === p
                    ? p === 'admit' ? 'bg-red-50 border-red-400 text-red-800' : 'bg-green-50 border-green-400 text-green-800'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                <input type="radio" name="plea" value={p} checked={plea === p}
                  onChange={() => setPlea(p)} className="sr-only" />
                {p === 'admit' ? 'I admit the offence' : 'I deny the offence'}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Written response</label>
          <textarea
            required
            rows={6}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="State your position clearly and directly address the particulars of the complaint…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supporting evidence <span className="text-gray-400">(optional, max 5 files)</span>
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.mp4,.doc,.docx"
            onChange={e => setFiles(Array.from(e.target.files))}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand hover:file:bg-brand-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
}
