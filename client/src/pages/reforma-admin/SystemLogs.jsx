import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import { LevelBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { Select } from '../../components/ui/Input';
import Input from '../../components/ui/Input';
import { formatDateTime } from '../../utils/formatters';
import { LOG_LEVELS, LOG_CATEGORIES } from '../../utils/constants';

export default function SystemLogs({ institutionId, embedded = false }) {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState({ level: '', category: '', from: '', to: '', search: '' });
  const intervalRef = useRef(null);

  function buildUrl() {
    const base = institutionId ? `/logs/institution/${institutionId}` : '/logs';
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `${base}?${p}`;
  }

  function load() {
    setLoading(true);
    api.get(buildUrl())
      .then(data => { setLogs(data.logs); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filters, institutionId]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, filters]);

  const content = (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-40">
          <Input placeholder="Search logs…" value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <Select value={filters.level} onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}>
          <option value="">All levels</option>
          {LOG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </Select>
        <Select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {LOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <Input type="date" value={filters.to}   onChange={e => setFilters(f => ({ ...f, to:   e.target.value }))} />
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
            className="w-4 h-4 accent-maroon rounded" />
          Auto-refresh
        </label>
      </div>

      <p className="text-xs text-muted mb-3">{total} entries</p>

      {loading
        ? <FullPageSpinner />
        : (
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-border">
                <tr>
                  {['Time', !institutionId ? 'Institution' : null, 'Level', 'Category', 'Message'].filter(Boolean).map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-cream cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      {!institutionId && <td className="px-4 py-3 text-xs text-ink">{log.institution?.name || 'Platform'}</td>}
                      <td className="px-4 py-3"><LevelBadge level={log.level} /></td>
                      <td className="px-4 py-3 text-xs text-muted">{log.category}</td>
                      <td className="px-4 py-3 text-ink">{log.message}</td>
                    </tr>
                    {expanded === log.id && (
                      <tr>
                        <td colSpan={institutionId ? 4 : 5} className="px-4 pb-4 bg-cream">
                          {log.detail && <p className="text-xs text-ink mt-1 mb-2">{log.detail}</p>}
                          {log.metadata && (
                            <pre className="text-xs bg-white border border-border rounded p-2 overflow-x-auto text-muted">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="py-12 text-center text-sm text-muted">No logs match your filters.</div>
            )}
          </div>
        )
      }
    </div>
  );

  if (embedded) return content;

  return (
    <AdminLayout title="System Logs">
      <PageHeader
        title="System Logs"
        breadcrumbs={[{ label: 'Dashboard', to: '/admin/dashboard' }, { label: 'System Logs' }]}
      />
      {content}
    </AdminLayout>
  );
}
