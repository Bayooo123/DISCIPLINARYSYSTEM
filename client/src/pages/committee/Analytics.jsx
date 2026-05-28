import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import api from '../../utils/api';
import CommitteeLayout from '../../components/ui/CommitteeLayout';
import { FullPageSpinner } from '../../components/ui/Spinner';

const STATUS_LABELS = {
  COMPLAINT_FILED: 'Filed', STUDENT_NOTIFIED: 'Notified', AWAITING_RESPONSE: 'Awaiting',
  RESPONSE_RECEIVED: 'Response In', RESPONSE_OVERDUE: 'Overdue', PANEL_CONSTITUTED: 'Panel Set',
  HEARING_SCHEDULED: 'Hearing Set', HEARING_COMPLETE: 'Hearing Done', VERDICT_DELIVERED: 'Pending Ratification',
  CLOSED: 'Closed', ESCALATED: 'Escalated',
};

const PIE_COLOURS = ['#7B1C1C', '#C9930A', '#2563EB', '#16A34A', '#9333EA', '#EA580C'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/committee/analytics').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <CommitteeLayout title="Analytics"><FullPageSpinner /></CommitteeLayout>;
  if (!data) return <CommitteeLayout title="Analytics"><p className="text-muted">Failed to load analytics.</p></CommitteeLayout>;

  const statusData = (data.byStatus || []).map(s => ({ name: STATUS_LABELS[s.status] || s.status, count: s.count }));
  const categoryData = (data.byOffenceCategory || []).map(c => ({ name: c.category.replace('_', ' '), value: c.count }));
  const facultyData = (data.byFaculty || []).slice(0, 8).map(f => ({ name: f.faculty?.replace('Faculty of ', ''), count: f.count }));
  const resolutionData = (data.resolutionByMonth || []).map(r => ({ month: r.month, days: r.avgDays }));

  return (
    <CommitteeLayout title="Analytics">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SCard label="Total Cases"        value={data.stats?.totalCases || 0} />
        <SCard label="Pending Response"   value={data.stats?.pendingResponse || 0} />
        <SCard label="Closed This Year"   value={data.stats?.closedThisYear || 0} />
        <SCard label="Avg Resolution"     value={resolutionData.length ? `${resolutionData[resolutionData.length-1]?.days || 0}d` : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cases by status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Cases by Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#7B1C1C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Offence category breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Offence Category Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cases by faculty */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Cases by Faculty</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={facultyData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#C9930A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution time */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Avg Resolution Time (days)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={resolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="days" stroke="#7B1C1C" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending caseload */}
      {data.pendingCaseload?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Pending Caseload — Stuck &gt;14 Days</p>
            <p className="text-xs text-gray-400 mt-0.5">Cases that have not progressed in over 14 working days</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.pendingCaseload.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono text-xs text-maroon font-semibold">{c.referenceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.studentName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.status.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-semibold ${c.daysInStatus > 30 ? 'text-red-600' : 'text-amber-600'}`}>{c.daysInStatus}d</span>
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

function SCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-3xl font-bold text-maroon">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
