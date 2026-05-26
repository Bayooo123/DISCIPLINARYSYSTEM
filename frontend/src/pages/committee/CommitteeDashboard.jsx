import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import CommitteeLayout from '../../components/CommitteeLayout';
import StageBadge from '../../components/StageBadge';

const STAGE_FILTERS = [
  { value: '', label: 'All cases' },
  { value: 'awaiting_response', label: 'Awaiting response' },
  { value: 'response_received', label: 'Response received' },
  { value: 'response_overdue', label: 'Response overdue' },
  { value: 'panel_constituted', label: 'Panel constituted' },
  { value: 'hearing_scheduled', label: 'Hearing scheduled' },
  { value: 'hearing_completed', label: 'Hearing completed' },
  { value: 'closed', label: 'Closed' },
];

export default function CommitteeDashboard() {
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [stage, setStage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = stage ? `/cases?stage=${stage}` : '/cases';
    setLoading(true);
    Promise.allSettled([
      api.get(url),
      api.get('/admin/analytics'),
    ]).then(([casesResult, analyticsResult]) => {
      if (casesResult.status === 'fulfilled') setCases(casesResult.value);
      if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value);
    }).finally(() => setLoading(false));
  }, [stage]);

  return (
    <CommitteeLayout title="Disciplinary Committee Dashboard">
      {/* Analytics strip */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total cases" value={analytics.summary.total} />
          <StatCard label="Active" value={analytics.summary.active} colour="orange" />
          <StatCard label="Closed" value={analytics.summary.closed} colour="green" />
          <StatCard
            label="Avg. resolution"
            value={analytics.avgResolutionDays ? `${analytics.avgResolutionDays}d` : '—'}
            colour="blue"
          />
        </div>
      )}

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STAGE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStage(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              stage === f.value
                ? 'bg-brand text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400 mt-4">Loading…</p>}

      {!loading && cases.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mt-4">
          <p className="text-gray-500">No cases match the selected filter.</p>
        </div>
      )}

      {cases.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Faculty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Filed by</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Filed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cases.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.reference}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.student_name}</p>
                    <p className="text-xs text-gray-400">{c.matric_number}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{c.faculty_name || '—'}</td>
                  <td className="px-4 py-3"><StageBadge stage={c.current_stage} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">{c.filed_by_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {new Date(c.filed_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/committee/cases/${c.id}`}
                      className="text-brand text-xs font-medium hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CommitteeLayout>
  );
}

function StatCard({ label, value, colour = 'brand' }) {
  const colours = {
    brand: 'bg-brand-50 border-brand-100 text-brand',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${colours[colour]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}
