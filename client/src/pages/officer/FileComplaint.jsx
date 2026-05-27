import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import OfficerLayout from '../../components/ui/OfficerLayout';
import StudentLookupField from '../../components/officer/StudentLookupField';
import OffenceSelector from '../../components/officer/OffenceSelector';
import EvidenceUpload from '../../components/officer/EvidenceUpload';
import ConfirmFilingModal from '../../components/officer/ConfirmFilingModal';
import { formatDate } from '../../utils/formatters';

const STEPS = ['Student', 'Offences', 'Incident Details', 'Evidence', 'Review'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${i < current  ? 'bg-maroon border-maroon text-white'
              : i === current ? 'bg-white border-maroon text-maroon'
              :                 'bg-white border-border text-muted'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-maroon font-semibold' : 'text-muted'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 min-w-[16px] mt-[-12px] ${i < current ? 'bg-maroon' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FileComplaint() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep]               = useState(0);
  const [offenceTypes, setOffenceTypes] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  // Form state
  const [student, setStudent]             = useState(null);
  const [selectedOffences, setSelectedOffences] = useState([]);
  const [form, setForm] = useState({
    originType:       'FACULTY',
    description:      '',
    incidentDate:     '',
    incidentLocation: '',
    witnessName:      '',
    courseCode:       '',
    courseTitle:      '',
  });
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  useEffect(() => {
    if (!user?.institutionId) return;
    api.get(`/institutions/${user.institutionId}/offence-types`)
      .then(data => setOffenceTypes(Array.isArray(data) ? data : data.offenceTypes || []))
      .catch(console.error);
  }, [user]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function canAdvance() {
    if (step === 0) return !!student;
    if (step === 1) return selectedOffences.length > 0;
    if (step === 2) return form.description.trim().length > 10 && form.incidentDate;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        matricNumber:    student.matricNumber,
        offenceTypeIds:  selectedOffences.map(o => o.id),
        ...form,
      };
      const newCase = await api.post('/cases', payload);

      // Upload evidence if any
      if (evidenceFiles.length > 0) {
        const fd = new FormData();
        evidenceFiles.forEach(f => fd.append('files', f));
        await api.post(`/cases/${newCase.id}/evidence`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/officer/cases/${newCase.id}`, { state: { filed: true } });
    } catch (err) {
      setError(err?.error || 'Failed to file complaint. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  const responseDeadline = form.incidentDate
    ? (() => {
        const d = new Date();
        let added = 0;
        const result = new Date(d);
        while (added < 3) {
          result.setDate(result.getDate() + 1);
          if (result.getDay() !== 0 && result.getDay() !== 6) added++;
        }
        return result.toISOString();
      })()
    : null;

  return (
    <OfficerLayout title="File Complaint">
      <div className="max-w-2xl mx-auto">
        <StepIndicator current={step} />

        <div className="bg-white border border-border rounded-2xl p-6">
          {/* Step 0 — Student */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif font-bold text-ink mb-1">Identify the Student</h3>
                <p className="text-sm text-muted mb-4">Enter the student's matric number to retrieve their record.</p>
              </div>
              <StudentLookupField value={student} onChange={setStudent} />
            </div>
          )}

          {/* Step 1 — Offences */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif font-bold text-ink mb-1">Select Alleged Offences</h3>
                <p className="text-sm text-muted mb-4">Select all applicable offence types from the list below.</p>
              </div>
              <OffenceSelector
                offenceTypes={offenceTypes}
                selected={selectedOffences}
                onChange={setSelectedOffences}
              />
            </div>
          )}

          {/* Step 2 — Incident Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif font-bold text-ink mb-1">Incident Details</h3>
                <p className="text-sm text-muted mb-4">Provide the specifics of the alleged incident.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">Origin Type</label>
                  <select
                    value={form.originType}
                    onChange={e => setField('originType', e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  >
                    <option value="FACULTY">Faculty</option>
                    <option value="HOSTEL">Hostel</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Incident Date *</label>
                  <input
                    type="date"
                    value={form.incidentDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setField('incidentDate', e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Location</label>
                  <input
                    type="text"
                    value={form.incidentLocation}
                    onChange={e => setField('incidentLocation', e.target.value)}
                    placeholder="e.g. Main Exam Hall"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Course Code</label>
                  <input
                    type="text"
                    value={form.courseCode}
                    onChange={e => setField('courseCode', e.target.value)}
                    placeholder="e.g. EEG 412"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Course Title</label>
                  <input
                    type="text"
                    value={form.courseTitle}
                    onChange={e => setField('courseTitle', e.target.value)}
                    placeholder="e.g. Advanced Control Systems"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">Witness Name</label>
                  <input
                    type="text"
                    value={form.witnessName}
                    onChange={e => setField('witnessName', e.target.value)}
                    placeholder="Full name and role"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">
                    Description of Incident *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    rows={5}
                    placeholder="Describe what happened in detail…"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white resize-none"
                  />
                  <p className="text-xs text-muted mt-1">{form.description.length} characters</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Evidence */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif font-bold text-ink mb-1">Attach Evidence <span className="text-muted font-normal text-sm">(optional)</span></h3>
                <p className="text-sm text-muted mb-4">Upload supporting documents, images, or recordings.</p>
              </div>
              <EvidenceUpload files={evidenceFiles} onChange={setEvidenceFiles} />
            </div>
          )}

          {/* Step 4 — Review summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif font-bold text-ink mb-1">Review & Submit</h3>
                <p className="text-sm text-muted mb-4">Review the complaint before filing. Click "File Complaint" to proceed.</p>
              </div>

              <div className="space-y-3 text-sm">
                <Section label="Student">
                  <p className="font-medium text-ink">{student?.firstName} {student?.lastName}</p>
                  <p className="text-muted text-xs">{student?.matricNumber} · {student?.faculty}</p>
                </Section>
                <Section label="Offences">
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedOffences.map(o => <li key={o.id} className="text-ink">{o.name}</li>)}
                  </ul>
                </Section>
                <Section label="Incident">
                  <p className="text-ink">{form.incidentDate} · {form.incidentLocation || 'Location not specified'}</p>
                  {form.courseCode && <p className="text-muted text-xs mt-0.5">{form.courseCode}{form.courseTitle ? ` — ${form.courseTitle}` : ''}</p>}
                </Section>
                <Section label="Description">
                  <p className="text-ink whitespace-pre-wrap">{form.description}</p>
                </Section>
                {evidenceFiles.length > 0 && (
                  <Section label="Evidence">
                    <p className="text-ink">{evidenceFiles.length} file{evidenceFiles.length > 1 ? 's' : ''} attached</p>
                  </Section>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-5 border-t border-border">
            <button
              type="button"
              onClick={() => step === 0 ? navigate('/officer/cases') : setStep(s => s - 1)}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink hover:bg-cream transition-colors"
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="bg-maroon text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 disabled:opacity-40 transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="bg-maroon text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors"
              >
                File Complaint
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmFilingModal
          data={{ student, offences: selectedOffences, responseDeadline, ...form }}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </OfficerLayout>
  );
}

function Section({ label, children }) {
  return (
    <div className="bg-cream rounded-xl p-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}
