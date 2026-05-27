import React from 'react';
import { formatDate } from '../../utils/formatters';
import OffenceChip from './OffenceChip';

export default function ConfirmFilingModal({ data, onConfirm, onCancel, submitting }) {
  const { student, offences, description, incidentDate, incidentLocation, courseCode, courseTitle, witnessName, responseDeadline } = data;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-ink">Confirm Complaint Filing</h2>
          <p className="text-sm text-muted mt-0.5">Please review the details before submitting. This action cannot be undone.</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Student */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Student</p>
            <p className="text-sm text-ink font-medium">{student?.firstName} {student?.lastName}</p>
            <p className="text-xs text-muted">{student?.matricNumber} · {student?.faculty}</p>
          </div>

          {/* Offences */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Alleged Offences</p>
            <div className="space-y-1.5">
              {offences.map(o => (
                <OffenceChip key={o.id} name={o.name} penaltyTier={o.penaltyTier} />
              ))}
            </div>
          </div>

          {/* Incident details */}
          <div className="bg-cream rounded-xl p-4 space-y-2 text-sm">
            <Row label="Incident Date"   value={formatDate(incidentDate)} />
            {incidentLocation && <Row label="Location"       value={incidentLocation} />}
            {courseCode        && <Row label="Course"         value={`${courseCode}${courseTitle ? ` — ${courseTitle}` : ''}`} />}
            {witnessName       && <Row label="Witness"        value={witnessName} />}
            {responseDeadline  && <Row label="Student Must Respond By" value={formatDate(responseDeadline)} />}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{description}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink hover:bg-cream transition-colors disabled:opacity-50"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-maroon text-white text-sm font-medium hover:bg-maroon/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Filing…' : 'File Complaint'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted w-44 flex-shrink-0 text-xs">{label}</span>
      <span className="text-ink font-medium text-xs">{value}</span>
    </div>
  );
}
