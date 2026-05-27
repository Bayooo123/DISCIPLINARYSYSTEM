import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import OfficerLayout from '../../components/ui/OfficerLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'AWAITING_RESPONSE',  label: 'Awaiting Response' },
  { value: 'RESPONSE_RECEIVED',  label: 'Response In' },
  { value: 'RESPONSE_OVERDUE',   label: 'Response Overdue' },
  { value: 'PANEL_CONSTITUTED',  label: 'Panel Set' },
  { value: 'HEARING_SCHEDULED',  label: 'Hearing Scheduled' },
  { value: 'HEARING_COMPLETE',   label: 'Hearing Complete' },
  { value: 'VERDICT_DELIVERED',  label: 'Verdict Delivered' },
  { value: 'CLOSED',             label: 'Closed' },
];

const STATUS_BADGE = {
  COMPLAINT_FILED:   { label: 'Filed',               cls: 'bg-orange-100 text-orange-800' },
  STUDENT_NOTIFIED:  { label: 'Notified',            cls: 'bg-yellow-100 text-yellow-800' },
  AWAITING_RESPONSE: { label: 'Awaiting Response',   cls: 'bg-amber-100 text-amber-800' },
  RESPONSE_RECEIVED: { label: 'Response In',         cls: 'bg-blue-100 text-blue-800' },
  RESPONSE_OVERDUE:  { label: 'Overdue',             cls: 'bg-red-100 text-red-800' },
  PANEL_CONSTITUTED: { label: 'Panel Set',           cls: 'bg-purple-100 text-purple-800' },
  HEARING_SCHEDULED: { label: 'Hearing Scheduled',   cls: 'bg-indigo-100 text-indigo-800' },
  HEARING_COMPLETE:  { label: 'Heard',               cls: 'bg-teal-100 text-teal-800' },
  VERDICT_DELIVERED: { label: 'Verdict Delivered',   cls: 'bg-green-100 text-green-800' },
  CLOSED:            { label: 'Closed',              cls: 'bg-gray-100 text-gray-600' },
  ESCALATED:         { label: 'Escalated',           cls: 'bg-rose-100 text-rose-800' },
};

export default function MyCases() {
  const navigate = useNavigate();
  const [data, setData]       = useState({ cases: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get(`/cases?${params}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <OfficerLayout title="My Cases">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) { setPage(1); } }}
            placeholder="Search by name, matric, reference…"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
          />
          <button
            type="submit"
            className="bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors"
          >
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Link
          to="/officer/cases/new"
          className="bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 transition-colors"
        >
          + File Complaint
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{data.total} case{data.total !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><FullPageSpinner /></div>
        ) : data.cases.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted text-sm">No cases found.</p>
            <Link to="/officer/cases/new" className="text-maroon text-sm hover:underline mt-2 inline-block">
              File your first complaint →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Reference</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Offence(s)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden lg:table-cell">Filed</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.cases.map(c => {
                const badge   = STATUS_BADGE[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-600' };
                const offence = c.offences?.[0]?.offenceType;
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/officer/cases/${c.id}`)}
                    className="hover:bg-cream cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-maroon font-medium">{c.referenceNumber}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{c.student?.firstName} {c.student?.lastName}</p>
                      <p className="text-xs text-muted">{c.student?.matricNumber}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted">
                      {offence?.name || '—'}
                      {c.offences?.length > 1 && <span className="text-xs ml-1 text-muted">+{c.offences.length - 1}</span>}
                    </td>
                    <td className="px-5 py-3 text-muted hidden lg:table-cell">{formatDate(c.filedAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data.pages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm text-maroon hover:underline disabled:text-muted disabled:no-underline"
            >
              ← Previous
            </button>
            <span className="text-xs text-muted">Page {page} of {data.pages}</span>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="text-sm text-maroon hover:underline disabled:text-muted disabled:no-underline"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </OfficerLayout>
  );
}
