import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import StageBadge from '../../components/StageBadge';
import PanelCaseDetail from './PanelCaseDetail';

export default function PanelDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/cases'),
      api.get('/admin/analytics'),
    ]).then(([casesRes, analyticsRes]) => {
      if (casesRes.status === 'fulfilled') setCases(casesRes.value);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
    }).finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  const upcomingHearings = cases.filter(c => c.current_stage === 'hearing_scheduled');
  const panelConstituted = cases.filter(c => c.current_stage === 'panel_constituted').length;
  const hearingScheduled = upcomingHearings.length;
  const hearingCompleted = cases.filter(c => ['hearing_completed', 'closed'].includes(c.current_stage)).length;

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 font-sans">

      {/* ── Left Sidebar ─────────────────────────────────── */}
      <aside className="w-60 bg-brand flex-shrink-0 flex flex-col select-none">
        {/* Branding */}
        <div className="px-5 pt-6 pb-5 border-b border-brand-600">
          <div className="w-11 h-11 bg-gold rounded-full flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg font-serif">⚖</span>
          </div>
          <p className="text-gold text-xs font-semibold tracking-widest uppercase leading-none">
            {user?.institutionName || 'UNILAG'}
          </p>
          <p className="text-white text-xs mt-1 opacity-75">Disciplinary System</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <SidebarItem icon="📋" label="My Cases" active />
          <SidebarItem icon="📅" label="Hearings" />
          <SidebarItem icon="📁" label="Panel Records" />
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-brand-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold font-serif">
                {user?.fullName?.charAt(0) || 'P'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{user?.fullName}</p>
              <p className="text-brand-200 text-xs opacity-75 leading-tight">Panel Member</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-brand-200 hover:text-white transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-stone-900 font-serif">Panel Member Portal</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <p className="text-xs text-stone-500 hidden sm:block">
            Welcome, <span className="font-medium text-stone-700">{user?.fullName?.split(' ')[0]}</span>
          </p>
        </header>

        <div className="p-5 space-y-5">

          {/* Hearing countdown banner */}
          {upcomingHearings.length > 0 && (
            <div className="bg-gold-50 border border-gold-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">📅</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {upcomingHearings.length === 1
                      ? 'Hearing scheduled'
                      : `${upcomingHearings.length} hearings scheduled`}
                  </p>
                  <p className="text-xs text-stone-500">
                    {upcomingHearings[0].reference} — {upcomingHearings[0].student_name}
                    {upcomingHearings.length > 1 && ` + ${upcomingHearings.length - 1} more`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleExpand(upcomingHearings[0].id)}
                className="flex-shrink-0 bg-gold text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-gold-600 transition-colors"
              >
                View case
              </button>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Assigned cases" value={cases.length} colour="brand" />
            <StatCard label="Panel constituted" value={panelConstituted} colour="purple" />
            <StatCard label="Hearings scheduled" value={hearingScheduled} colour="gold" />
            <StatCard label="Hearings completed" value={hearingCompleted} colour="green" />
          </div>

          {/* Cases table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                Assigned Cases
                {!loading && (
                  <span className="ml-2 bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded text-xs font-normal">
                    {cases.length}
                  </span>
                )}
              </h2>
            </div>

            {loading && (
              <p className="text-sm text-stone-400 py-4">Loading cases…</p>
            )}

            {!loading && cases.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
                <p className="text-stone-400 text-sm">No cases have been assigned to you yet.</p>
              </div>
            )}

            {cases.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Reference</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden md:table-cell">Faculty</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">Stage</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden lg:table-cell">Filed</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map(c => (
                      <React.Fragment key={c.id}>
                        <tr
                          className={`border-b border-stone-100 cursor-pointer transition-colors ${
                            expandedId === c.id
                              ? 'bg-brand-50'
                              : 'hover:bg-stone-50'
                          }`}
                          onClick={() => toggleExpand(c.id)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-stone-500">{c.reference}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-stone-900 text-sm">{c.student_name}</p>
                            <p className="text-xs text-stone-400">{c.matric_number}</p>
                          </td>
                          <td className="px-4 py-3 text-stone-500 text-sm hidden md:table-cell">{c.faculty_name || '—'}</td>
                          <td className="px-4 py-3"><StageBadge stage={c.current_stage} /></td>
                          <td className="px-4 py-3 text-stone-400 text-xs hidden lg:table-cell">
                            {new Date(c.filed_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-medium ${expandedId === c.id ? 'text-brand' : 'text-stone-400'}`}>
                              {expandedId === c.id ? '▲ Close' : '▼ Details'}
                            </span>
                          </td>
                        </tr>

                        {expandedId === c.id && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-stone-50 border-b border-stone-200">
                              <PanelCaseDetail caseId={c.id} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Right Sidebar ─────────────────────────────────── */}
      <aside className="w-64 bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto hidden xl:block">

        {/* Upcoming hearings */}
        <div className="px-5 py-5 border-b border-stone-100">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
            Upcoming Hearings
          </h3>
          {upcomingHearings.length === 0 ? (
            <p className="text-xs text-stone-400">No hearings scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingHearings.map(c => (
                <li
                  key={c.id}
                  className="flex items-start gap-2.5 cursor-pointer group"
                  onClick={() => toggleExpand(c.id)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-stone-800 group-hover:text-brand transition-colors font-mono">
                      {c.reference}
                    </p>
                    <p className="text-xs text-stone-500">{c.student_name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Institution analytics */}
        {analytics && (
          <div className="px-5 py-5 border-b border-stone-100">
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
              Institution Overview
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Total cases', value: analytics.summary.total, colour: 'text-stone-800' },
                { label: 'Active', value: analytics.summary.active, colour: 'text-amber-700' },
                { label: 'Closed', value: analytics.summary.closed, colour: 'text-green-700' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.colour}`}>{item.value}</span>
                </div>
              ))}
              {analytics.avgResolutionDays && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Avg. resolution</span>
                  <span className="text-xs font-semibold text-stone-800">{analytics.avgResolutionDays}d</span>
                </div>
              )}
            </div>

            {/* Stage breakdown bars */}
            {analytics.byStage?.length > 0 && analytics.summary.total > 0 && (
              <div className="mt-4 space-y-2">
                {analytics.byStage.slice(0, 5).map(s => (
                  <div key={s.stage} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all"
                        style={{ width: `${Math.min(100, (s.count / analytics.summary.total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 w-3 text-right shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage legend */}
        <div className="px-5 py-5">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Stage Legend</h3>
          <ul className="space-y-2">
            {[
              { dot: 'bg-orange-400', label: 'Awaiting response' },
              { dot: 'bg-purple-400', label: 'Panel constituted' },
              { dot: 'bg-indigo-400', label: 'Hearing scheduled' },
              { dot: 'bg-teal-500',   label: 'Hearing completed' },
              { dot: 'bg-stone-400',  label: 'Closed' },
            ].map(s => (
              <li key={s.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="text-xs text-stone-500">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
      active
        ? 'bg-brand-600 text-white'
        : 'text-brand-200 hover:bg-brand-600 hover:text-white'
    }`}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ label, value, colour }) {
  const palette = {
    brand:  'bg-brand-50 border-brand-100 text-brand',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    gold:   'bg-amber-50 border-amber-100 text-amber-700',
    green:  'bg-green-50 border-green-100 text-green-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${palette[colour]}`}>
      <p className="text-2xl font-bold font-serif">{value ?? '—'}</p>
      <p className="text-xs mt-1 opacity-70 font-sans">{label}</p>
    </div>
  );
}
