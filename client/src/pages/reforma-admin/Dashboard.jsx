import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import StatCard from '../../components/ui/StatCard';
import { LicenceBadge, LevelBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, daysUntil } from '../../utils/formatters';

export default function ReformaDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/reforma')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title="Reforma Admin Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Institutions" value={data?.totalInstitutions} accent="maroon" />
        <StatCard label="Active Institutions" value={data?.activeInstitutions} accent="green" />
        <StatCard label="Total Users" value={data?.totalUsers} accent="blue" />
        <StatCard label="Notifications (7d)" value={data?.notificationsSent7d} accent="gold" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-6">

          {/* Licence Alerts */}
          {data?.licenceAlerts?.length > 0 && (
            <div className="bg-gold-pale border border-gold rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gold-700 mb-3 flex items-center gap-2">
                ⚠️ Licence Expiry Alerts
              </h3>
              <div className="space-y-2">
                {data.licenceAlerts.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gold/30">
                    <div>
                      <p className="text-sm font-medium text-ink">{inst.name}</p>
                      <p className="text-xs text-muted">Expires {formatDate(inst.licenceEnd)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-700">{inst.daysRemaining}d left</span>
                      <Link to={`/admin/institutions/${inst.id}`}
                        className="text-xs bg-maroon text-white px-3 py-1.5 rounded-md hover:bg-maroon-800 transition-colors">
                        Renew
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutions table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Institutions</h3>
              <Link to="/admin/institutions" className="text-xs text-maroon hover:underline">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream border-b border-border">
                  <tr>
                    {['Institution', 'Status', 'Users', 'Licence Expiry'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{h}</th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.institutions?.slice(0, 8).map(inst => (
                    <tr key={inst.id} className="hover:bg-cream transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{inst.name}</p>
                        <p className="text-xs text-muted">{inst.slug}</p>
                      </td>
                      <td className="px-4 py-3"><LicenceBadge status={inst.licenceStatus} /></td>
                      <td className="px-4 py-3 text-muted">{inst._count?.users || 0}</td>
                      <td className="px-4 py-3 text-muted text-xs">{formatDate(inst.licenceEnd)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/institutions/${inst.id}`}
                          className="text-maroon text-xs font-medium hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">System Health</h3>
            <div className="space-y-3">
              <HealthRow label="Email delivery (7d)" value={`${data?.systemHealth?.emailDeliveryRate ?? '—'}%`}
                colour={data?.systemHealth?.emailDeliveryRate >= 95 ? 'green' : 'amber'} />
              <HealthRow label="SMS delivery (7d)" value={`${data?.systemHealth?.smsDeliveryRate ?? '—'}%`}
                colour={data?.systemHealth?.smsDeliveryRate >= 95 ? 'green' : 'amber'} />
              <HealthRow label="Errors (24h)" value={data?.systemHealth?.errorCount24h ?? 0}
                colour={data?.systemHealth?.errorCount24h === 0 ? 'green' : data?.systemHealth?.errorCount24h <= 5 ? 'amber' : 'red'} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {data?.recentActivity?.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <LevelBadge level={log.level} />
                  <div className="min-w-0">
                    <p className="text-xs text-ink truncate">{log.message}</p>
                    <p className="text-xs text-muted">{log.institution?.name}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/admin/logs" className="text-xs text-maroon hover:underline mt-3 block">
              View all logs →
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function HealthRow({ label, value, colour }) {
  const colours = { green: 'text-green-700', amber: 'text-amber-700', red: 'text-red-700' };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${colours[colour] || 'text-ink'}`}>{value}</span>
    </div>
  );
}
