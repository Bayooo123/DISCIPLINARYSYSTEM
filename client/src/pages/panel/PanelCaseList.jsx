import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';

const STATUS_META = {
  PANEL_CONSTITUTED: { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED: { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:  { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED: { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:            { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:         { label: 'Escalated',            cls: 'bg-red-100 text-red-800' },
};

const PANEL_ROLE_CLS = {
  CHAIRPERSON: 'bg-maroon text-white',
  SECRETARY: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

export default function PanelCaseList() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/panel/cases').then(setCases).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = cases.filter(c => c.status !== 'CLOSED');
  const closed = cases.filter(c => c.status === 'CLOSED');

  return (
    <CommitteeLayout title="My Cases">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{cases.length} case{cases.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      {loading ? <FullPageSpinner /> : cases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">You have not been assigned to any panel cases yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <CaseTable title="Active Cases" cases={active} navigate={navigate} />
          )}
          {closed.length > 0 && (
            <CaseTable title="Closed Cases" cases={closed} navigate={navigate} muted />
          )}
        </div>
      )}
    </CommitteeLayout>
  );
}

function CaseTable({ title, cases, navigate, muted = false }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Offences</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Hearing</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">My Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map(c => {
              const { label, cls } = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-700' };
              return (
                <tr
                  key={c.id}
                  className={`cursor-pointer hover:bg-gray-50 ${muted ? 'opacity-70' : ''}`}
                  onClick={() => navigate(`/panel/cases/${c.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-maroon">{c.referenceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.student?.firstName} {c.student?.lastName}</p>
                    <p className="text-xs text-gray-400">{c.student?.matricNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-[180px]">
                    {c.offences?.slice(0, 2).map(o => o.offenceType?.name).join(', ')}
                    {c.offences?.length > 2 ? ` +${c.offences.length - 2}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                    {c.hearingDate ? formatDate(c.hearingDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PANEL_ROLE_CLS[c.panelRole] || 'bg-gray-100 text-gray-700'}`}>
                      {c.panelRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-maroon">View →</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
