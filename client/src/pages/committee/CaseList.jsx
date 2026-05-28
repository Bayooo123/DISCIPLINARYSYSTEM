import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  COMPLAINT_FILED:   { label: 'Filed',                cls: 'bg-gray-100 text-gray-700' },
  STUDENT_NOTIFIED:  { label: 'Notified',             cls: 'bg-gray-100 text-gray-700' },
  AWAITING_RESPONSE: { label: 'Awaiting Response',    cls: 'bg-amber-100 text-amber-800' },
  RESPONSE_RECEIVED: { label: 'Response Received',    cls: 'bg-blue-100 text-blue-800' },
  RESPONSE_OVERDUE:  { label: 'Overdue',              cls: 'bg-red-100 text-red-800' },
  PANEL_CONSTITUTED: { label: 'Panel Assigned',       cls: 'bg-blue-100 text-blue-800' },
  HEARING_SCHEDULED: { label: 'Hearing Set',          cls: 'bg-teal-100 text-teal-800' },
  HEARING_COMPLETE:  { label: 'Hearing Done',         cls: 'bg-purple-100 text-purple-800' },
  VERDICT_DELIVERED: { label: 'Pending Ratification', cls: 'bg-yellow-100 text-yellow-800' },
  CLOSED:            { label: 'Closed',               cls: 'bg-green-100 text-green-800' },
  ESCALATED:         { label: 'Escalated',            cls: 'bg-red-100 text-red-900' },
};

const ALL_STATUSES = Object.keys(STATUS_META);

export default function CaseList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const fetchCases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.from)   params.set('from', filters.from);
    if (filters.to)     params.set('to', filters.to);
    api.get(`/committee/cases?${params}`)
      .then(r => { setCases(r.cases || []); setTotal(r.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const set = key => e => { setFilters(f => ({ ...f, [key]: e.target.value })); setPage(1); };

  const isChairman = user?.isChairman;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <CommitteeLayout title="All Cases">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input className="input w-full" placeholder="Reference, student name, matric…" value={filters.search} onChange={set('search')} />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select className="input w-full" value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filed from</label>
          <input type="date" className="input" value={filters.from} onChange={set('from')} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Filed to</label>
          <input type="date" className="input" value={filters.to} onChange={set('to')} />
        </div>
        <button onClick={() => { setFilters({ search: '', status: '', from: '', to: '' }); setPage(1); }} className="btn btn-secondary text-sm">Clear</button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{total} case{total !== 1 ? 's' : ''} found</p>
        <div className="flex gap-2">
          {page > 1 && <button className="btn btn-secondary text-xs" onClick={() => setPage(p => p - 1)}>← Prev</button>}
          {page < totalPages && <button className="btn btn-secondary text-xs" onClick={() => setPage(p => p + 1)}>Next →</button>}
        </div>
      </div>

      {loading ? <FullPageSpinner /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Offence(s)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Filed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Hearing</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No cases match your filters.</td></tr>
              )}
              {cases.map(c => {
                const { label, cls } = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/committee/cases/${c.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-maroon">{c.referenceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.student?.firstName} {c.student?.lastName}</p>
                      <p className="text-xs text-gray-400">{c.student?.matricNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-[200px]">
                      {c.offences?.slice(0, 2).map(o => o.offenceType?.name).join(', ')}{c.offences?.length > 2 ? ` +${c.offences.length - 2}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{formatDate(c.filedAt)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {c.hearingDate ? formatDate(c.hearingDate) : '—'}
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
      )}
    </CommitteeLayout>
  );
}
