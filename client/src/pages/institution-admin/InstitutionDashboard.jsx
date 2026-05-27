import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import StatCard from '../../components/ui/StatCard';
import { LicenceBadge } from '../../components/ui/Badge';
import { LevelBadge } from '../../components/ui/Badge';
import IntegrationStatus from '../../components/ui/IntegrationStatus';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { roleLabel, formatDateTime } from '../../utils/formatters';

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.institutionId) return;
    api.get(`/dashboard/institution/${user.institutionId}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <FullPageSpinner />;

  const inst = data?.institution;

  return (
    <AdminLayout title={inst?.name || 'Dashboard'} isInstitution>
      {/* Institution header */}
      <div className="bg-white border border-border rounded-xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-serif font-bold text-lg flex-shrink-0"
          style={{ background: inst?.primaryColor || '#7B1C1C' }}
        >
          {inst?.name?.[0] || 'I'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-serif font-bold text-ink">{inst?.name}</h2>
            <LicenceBadge status={inst?.licenceStatus} />
          </div>
          <p className="text-xs text-muted">Institution Administration Portal</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users"        value={data?.totalUsers}    accent="maroon" />
        <StatCard label="Pending Invites"    value={data?.pendingInvites} accent="amber" />
        <StatCard label="Offence Types"      value={data?.offenceTypeCount} accent="blue" />
        <StatCard label="Complaints Officers"
          value={data?.usersByRole?.COMPLAINTS_OFFICER || 0} accent="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by role */}
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Users by Role</h3>
          <div className="space-y-2">
            {[
              'COMPLAINTS_OFFICER', 'COMMITTEE_MEMBER', 'PANEL_MEMBER',
              'INSTITUTION_ADMIN', 'STUDENT',
            ].map(role => {
              const count = data?.usersByRole?.[role] || 0;
              const max   = data?.totalUsers || 1;
              return (
                <div key={role} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-44 flex-shrink-0">{roleLabel(role)}</span>
                  <div className="flex-1 bg-cream rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-maroon transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-ink w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Link to="/institution/users" className="text-xs text-maroon hover:underline">Manage users →</Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Integrations */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Integration Status</h3>
            <IntegrationStatus label="Email" connected={data?.integrationStatus?.email} />
            <IntegrationStatus label="SMS Gateway" connected={data?.integrationStatus?.sms} />
            <IntegrationStatus label="Student Information System" connected={data?.integrationStatus?.sis} />
          </div>

          {/* Recent logs */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Recent System Logs</h3>
            <div className="space-y-2">
              {data?.recentSystemLogs?.map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <LevelBadge level={log.level} />
                  <div className="min-w-0">
                    <p className="text-xs text-ink truncate">{log.message}</p>
                    <p className="text-xs text-muted">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/institution/logs" className="text-xs text-maroon hover:underline mt-3 block">
              View all logs →
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
