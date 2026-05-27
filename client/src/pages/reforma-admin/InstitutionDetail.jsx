import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { LicenceBadge, RoleBadge, StatusBadge } from '../../components/ui/Badge';
import IntegrationStatus from '../../components/ui/IntegrationStatus';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateTime } from '../../utils/formatters';
import SystemLogs from './SystemLogs';

const TABS = ['Overview', 'Users', 'Offence Types', 'System Logs'];

export default function InstitutionDetail() {
  const { id }           = useParams();
  const [inst, setInst]  = useState(null);
  const [tab, setTab]    = useState('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/institutions/${id}`)
      .then(setInst)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (!inst)   return <div className="p-6 text-red-600">Institution not found.</div>;

  return (
    <AdminLayout title={inst.name}>
      <PageHeader
        title={inst.name}
        subtitle={inst.shortName}
        breadcrumbs={[
          { label: 'Institutions', to: '/admin/institutions' },
          { label: inst.shortName || inst.name },
        ]}
        actions={
          <Link to={`/admin/institutions/${id}/edit`}>
            <Button variant="secondary" size="sm">Edit</Button>
          </Link>
        }
      />

      {/* Header card */}
      <div className="bg-white border border-border rounded-xl p-5 mb-6 flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-serif font-bold text-xl flex-shrink-0"
          style={{ background: inst.primaryColor }}
        >
          {inst.shortName?.[0] || inst.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-serif font-bold text-ink">{inst.name}</h2>
            <LicenceBadge status={inst.licenceStatus} />
          </div>
          <p className="text-sm text-muted">{inst.contactEmail} · {inst.contactPhone}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div><p className="text-2xl font-serif font-bold text-ink">{inst.users?.length || 0}</p><p className="text-xs text-muted">Users</p></div>
          <div><p className="text-2xl font-serif font-bold text-ink">{inst._count?.cases || 0}</p><p className="text-xs text-muted">Cases</p></div>
          <div><p className="text-2xl font-serif font-bold text-ink">{inst.offenceTypes?.filter(o => o.isActive).length || 0}</p><p className="text-xs text-muted">Offence Types</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-maroon text-maroon' : 'border-transparent text-muted hover:text-ink'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab inst={inst} />}
      {tab === 'Users' && <UsersTab users={inst.users || []} institutionId={id} />}
      {tab === 'Offence Types' && <OffenceTypesTab types={inst.offenceTypes || []} institutionId={id} onRefresh={() => api.get(`/institutions/${id}`).then(setInst)} />}
      {tab === 'System Logs' && <SystemLogs institutionId={id} embedded />}
    </AdminLayout>
  );
}

function OverviewTab({ inst }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white border border-border rounded-xl p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-ink mb-2">Contact & Location</h3>
        <Row label="Address" value={inst.address} />
        <Row label="Website" value={inst.website} />
        <Row label="State"   value={inst.state} />
        <Row label="Country" value={inst.country} />
      </div>
      <div className="bg-white border border-border rounded-xl p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-ink mb-2">Licence</h3>
        <Row label="Status"    value={<LicenceBadge status={inst.licenceStatus} />} />
        <Row label="Start"     value={formatDate(inst.licenceStart)} />
        <Row label="End"       value={formatDate(inst.licenceEnd)} />
        <Row label="Contract"  value={inst.contractRef} />
      </div>
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-ink mb-2 text-sm">Integrations</h3>
        <IntegrationStatus label="Email (SMTP)" connected={!!(inst.smtpHost && inst.smtpUser)} detail={inst.smtpHost || undefined} />
        <IntegrationStatus label="SMS Gateway" connected={inst.smsEnabled} detail={inst.smsSenderId || undefined} />
        <IntegrationStatus label="Student Information System" connected={!!inst.sisApiUrl} />
      </div>
      <div className="bg-white border border-border rounded-xl p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-ink mb-2">Branding</h3>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg border border-border" style={{ background: inst.primaryColor }} />
          <div className="w-10 h-10 rounded-lg border border-border" style={{ background: inst.secondaryColor }} />
        </div>
        {inst.notes && <><Row label="Notes" value={inst.notes} /></>}
      </div>
    </div>
  );
}

function UsersTab({ users, institutionId }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{users.length} Users</p>
        <Link to={`/admin/institutions/${institutionId}/users/new`}>
          <Button size="sm" variant="gold">+ Add User</Button>
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-cream border-b border-border">
          <tr>
            {['Name', 'Role', 'Status', 'Last Login', 'Invited'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-cream">
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-muted">{u.email}</p>
              </td>
              <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
              <td className="px-4 py-3"><StatusBadge active={u.isActive} pendingInvite={!u.inviteAccepted} /></td>
              <td className="px-4 py-3 text-muted text-xs">{formatDateTime(u.lastLoginAt)}</td>
              <td className="px-4 py-3 text-xs">{u.inviteAccepted ? '✓ Accepted' : '⏳ Pending'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OffenceTypesTab({ types, institutionId, onRefresh }) {
  const categories = [...new Set(types.map(t => t.category))];
  return (
    <div className="space-y-4">
      {categories.map(cat => (
        <div key={cat} className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">{cat}</h3>
          <div className="space-y-2">
            {types.filter(t => t.category === cat).map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2.5 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  {t.description && <p className="text-xs text-muted">{t.description}</p>}
                </div>
                <span className={`text-xs font-medium ${t.isActive ? 'text-green-700' : 'text-muted'}`}>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted w-28 flex-shrink-0">{label}</span>
      <span className="text-ink">{value || '—'}</span>
    </div>
  );
}
