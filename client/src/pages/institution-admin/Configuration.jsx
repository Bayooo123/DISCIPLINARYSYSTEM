import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import IntegrationStatus from '../../components/ui/IntegrationStatus';
import { LicenceBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';

function Row({ label, value }) {
  return (
    <div className="flex gap-3 text-sm border-b border-border last:border-none py-3">
      <span className="text-muted w-40 flex-shrink-0">{label}</span>
      <span className="text-ink">{value || '—'}</span>
    </div>
  );
}

export default function Configuration() {
  const { user }           = useAuth();
  const [inst, setInst]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.institutionId) return;
    api.get(`/institutions/${user.institutionId}`)
      .then(setInst).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title="Institution Settings" isInstitution>
      <PageHeader
        title="Institution Settings"
        subtitle="Read-only view of your institution's configuration"
        breadcrumbs={[{ label: 'Dashboard', to: '/institution/dashboard' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Institution Details</h3>
          <Row label="Full Name"      value={inst?.name} />
          <Row label="Short Name"     value={inst?.shortName} />
          <Row label="Contact Email"  value={inst?.contactEmail} />
          <Row label="Contact Phone"  value={inst?.contactPhone} />
          <Row label="Website"        value={inst?.website} />
          <Row label="Address"        value={inst?.address} />
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Licence</h3>
          <div className="mb-3"><LicenceBadge status={inst?.licenceStatus} /></div>
          <Row label="Start"    value={formatDate(inst?.licenceStart)} />
          <Row label="End"      value={formatDate(inst?.licenceEnd)} />
          <Row label="Contract" value={inst?.contractRef} />
        </div>

        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Branding</h3>
          <div className="flex gap-4 mb-4">
            <div>
              <p className="text-xs text-muted mb-1">Primary</p>
              <div className="w-10 h-10 rounded-lg border border-border" style={{ background: inst?.primaryColor }} />
              <p className="text-xs text-muted mt-1">{inst?.primaryColor}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Secondary</p>
              <div className="w-10 h-10 rounded-lg border border-border" style={{ background: inst?.secondaryColor }} />
              <p className="text-xs text-muted mt-1">{inst?.secondaryColor}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-ink">Integrations</h3>
          <IntegrationStatus label="Email (SMTP)"   connected={!!(inst?.smtpHost && inst?.smtpUser)} detail={inst?.smtpHost || undefined} />
          <IntegrationStatus label="SMS Gateway"    connected={inst?.smsEnabled} detail={inst?.smsSenderId || undefined} />
          <IntegrationStatus label="Student Information System" connected={!!inst?.sisApiUrl} />
        </div>
      </div>

      <div className="mt-5 bg-gold-pale border border-gold/30 rounded-xl p-4 text-sm text-amber-800">
        To update integration settings, branding, or licence — please contact <strong>Reforma Digital Solutions Ltd</strong>.
      </div>
    </AdminLayout>
  );
}
