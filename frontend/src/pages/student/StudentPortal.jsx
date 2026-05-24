import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Layout from '../../components/Layout';
import StageBadge from '../../components/StageBadge';
import { useAuth } from '../../context/AuthContext';

export default function StudentPortal() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cases')
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeCases = cases.filter(c => c.current_stage !== 'closed');
  const closedCases = cases.filter(c => c.current_stage === 'closed');

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Welcome */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-500">Welcome,</p>
          <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            This is your disciplinary portal. All formal communications regarding disciplinary
            matters will appear here.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && cases.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-medium">No disciplinary cases</p>
            <p className="text-sm text-green-600 mt-1">
              You have no active or historical disciplinary cases on record.
            </p>
          </div>
        )}

        {activeCases.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Active Cases
            </h3>
            <div className="space-y-3">
              {activeCases.map(c => (
                <CaseCard key={c.id} case={c} />
              ))}
            </div>
          </section>
        )}

        {closedCases.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Closed Cases
            </h3>
            <div className="space-y-3 opacity-75">
              {closedCases.map(c => (
                <CaseCard key={c.id} case={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function CaseCard({ case: c }) {
  return (
    <Link
      to={`/portal/cases/${c.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-brand hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 font-mono">{c.reference}</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">
            {c.offence_description}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Filed {new Date(c.filed_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
          </p>
        </div>
        <div className="shrink-0">
          <StageBadge stage={c.current_stage} />
        </div>
      </div>

      {c.current_stage === 'awaiting_response' && c.response_deadline && (
        <div className="mt-3 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
          Response required by{' '}
          <strong>{new Date(c.response_deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })}</strong>
        </div>
      )}
    </Link>
  );
}
