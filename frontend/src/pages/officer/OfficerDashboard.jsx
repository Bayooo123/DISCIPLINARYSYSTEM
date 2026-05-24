import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';
import StageBadge from '../../components/StageBadge';

export default function OfficerDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/complaints/mine')
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Complaints Officer Dashboard">
      <div className="max-w-4xl mx-auto">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">
              {cases.length} complaint{cases.length !== 1 ? 's' : ''} filed by you
            </p>
          </div>
          <Link
            to="/officer/file"
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            File New Complaint
          </Link>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && cases.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500">No complaints filed yet.</p>
            <Link to="/officer/file" className="text-brand text-sm mt-2 inline-block hover:underline">
              File your first complaint →
            </Link>
          </div>
        )}

        {cases.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Filed</th>
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
                    <td className="px-4 py-3 text-gray-600">{c.faculty_name || '—'}</td>
                    <td className="px-4 py-3"><StageBadge stage={c.current_stage} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.filed_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
