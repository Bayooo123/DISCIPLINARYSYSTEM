import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';

export default function FileComplaint() {
  const navigate = useNavigate();

  // Matric lookup
  const [matric, setMatric] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Complaint form
  const [offenceDescription, setOffenceDescription] = useState('');
  const [regulationBreached, setRegulationBreached] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [files, setFiles] = useState([]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  async function handleLookup(e) {
    e.preventDefault();
    if (!matric.trim()) return;
    setLookupError('');
    setStudent(null);
    setLookupLoading(true);
    try {
      const data = await api.get(`/complaints/lookup/${matric.trim().toUpperCase()}`);
      setStudent(data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!student) { setError('Please look up a student first.'); return; }
    if (!offenceDescription.trim()) { setError('Offence description is required.'); return; }
    setError('');
    setSubmitLoading(true);
    try {
      const form = new FormData();
      form.append('studentId', student.studentId);
      form.append('offenceDescription', offenceDescription);
      form.append('regulationBreached', regulationBreached);
      form.append('incidentDate', incidentDate);
      form.append('incidentLocation', incidentLocation);
      files.forEach(f => form.append('evidence', f));

      const result = await api.postForm('/complaints', form);
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complaint Filed</h2>
          <p className="text-gray-500 mb-1">Case Reference</p>
          <p className="text-lg font-mono font-bold text-brand mb-2">{success.reference}</p>
          <p className="text-sm text-gray-500 mb-6">
            The student has been formally notified by email and SMS.
            They have three working days to submit a response.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); setStudent(null); setMatric(''); setOffenceDescription(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              File Another
            </button>
            <Link to="/officer" className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="File a Complaint">
      <div className="max-w-2xl mx-auto">
        <Link to="/officer" className="text-sm text-brand hover:underline mb-6 inline-block">
          ← Back to dashboard
        </Link>

        {/* Step 1: Matric lookup */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Step 1 — Identify the Student</h3>
          <p className="text-xs text-gray-500 mb-4">
            Enter the student's matriculation number. The system will verify their details from the student record.
          </p>

          <form onSubmit={handleLookup} className="flex gap-3">
            <input
              type="text"
              value={matric}
              onChange={e => setMatric(e.target.value)}
              placeholder="e.g. 200404001"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand uppercase"
            />
            <button
              type="submit"
              disabled={lookupLoading || !matric.trim()}
              className="px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {lookupLoading ? 'Looking up…' : 'Look up'}
            </button>
          </form>

          {lookupError && (
            <p className="text-sm text-red-600 mt-3">{lookupError}</p>
          )}

          {student && (
            <div className="mt-4 p-4 bg-brand-50 border border-brand-100 rounded-lg">
              <p className="text-xs text-brand font-semibold uppercase mb-2">Student confirmed</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Full name</dt>
                  <dd className="font-medium text-gray-900">{student.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Matric number</dt>
                  <dd className="font-mono text-gray-900">{student.matricNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Faculty</dt>
                  <dd className="text-gray-900">{student.faculty || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Level</dt>
                  <dd className="text-gray-900">{student.level || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="text-gray-900">{student.email}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Step 2: Complaint details */}
        {student && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Step 2 — Particulars of the Complaint</h3>
            <p className="text-xs text-gray-500 mb-4">
              Describe the alleged offence with sufficient detail for the committee to understand the nature of the incident.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nature of alleged offence <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={offenceDescription}
                  onChange={e => setOffenceDescription(e.target.value)}
                  placeholder="Describe the alleged offence clearly and factually…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regulation or rule alleged to have been breached
                </label>
                <input
                  type="text"
                  value={regulationBreached}
                  onChange={e => setRegulationBreached(e.target.value)}
                  placeholder="e.g. Section 4.2 of the University Student Code of Conduct"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of incident</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={incidentLocation}
                    onChange={e => setIncidentLocation(e.target.value)}
                    placeholder="e.g. Faculty of Law, Room 204"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting evidence <span className="text-gray-400">(optional, max 10 files, 50 MB each)</span>
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.doc,.docx"
                  onChange={e => setFiles(Array.from(e.target.files))}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand"
                />
                {files.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800">
                  By clicking "File Complaint", you confirm that the information provided is accurate to the best of your knowledge.
                  The student will be notified immediately.
                </div>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-brand text-white py-3 rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-brand-700 transition-colors"
                >
                  {submitLoading ? 'Filing complaint…' : 'File Complaint'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
