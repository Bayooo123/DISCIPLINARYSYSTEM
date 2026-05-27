import React from 'react';
import { initials } from '../../utils/formatters';

export default function StudentCard({ student, onClear }) {
  if (!student) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-maroon flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-bold">
          {initials(student.firstName, student.lastName)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-ink">{student.firstName} {student.lastName}</p>
          {student.source && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${student.source === 'SIS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {student.source}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{student.matricNumber}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
          <span>{student.faculty}</span>
          {student.department && student.department !== student.faculty && <span>{student.department}</span>}
          <span>{student.level}</span>
          {student.yearOfAdmission && <span>Admitted {student.yearOfAdmission}</span>}
          {student.email && <span>{student.email}</span>}
        </div>
        {student.priorCaseCount > 0 && (
          <p className="mt-1 text-xs text-amber-700 font-medium">
            ⚠ {student.priorCaseCount} prior case{student.priorCaseCount !== 1 ? 's' : ''} on record
          </p>
        )}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted hover:text-red-600 flex-shrink-0 transition-colors"
        >
          Change
        </button>
      )}
    </div>
  );
}
