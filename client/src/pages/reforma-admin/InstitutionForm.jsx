import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input, { Textarea, Select } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { FullPageSpinner } from '../../components/ui/Spinner';

const SECTIONS = ['Basic Info', 'Branding', 'Email (SMTP)', 'SMS', 'SIS Integration', 'Licence'];

function Section({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-xl p-6 mb-4">
      <h3 className="text-base font-serif font-semibold text-ink mb-5 pb-3 border-b border-border">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

export default function InstitutionForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    name: '', slug: '', shortName: '', country: 'Nigeria', state: '', address: '',
    website: '', contactEmail: '', contactPhone: '',
    primaryColor: '#7B1C1C', secondaryColor: '#C9930A',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', emailFromName: '', emailFromAddr: '',
    smsEnabled: false, smsSenderId: '',
    sisApiUrl: '', sisApiKey: '',
    licenceStatus: 'ACTIVE', licenceStart: '', licenceEnd: '', contractRef: '', notes: '',
  });
  const [loading, setLoading]     = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/institutions/${id}`)
      .then(inst => setForm(f => ({ ...f, ...inst })))
      .catch(() => setError('Failed to load institution'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === 'name' && !isEdit) {
      setForm(f => ({ ...f, [key]: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/institutions/${id}`, form);
      } else {
        await api.post('/institutions', form);
      }
      navigate('/admin/institutions');
    } catch (err) {
      setError(err.error || 'Failed to save institution');
    } finally {
      setSubmitting(false);
    }
  }

  async function sendTestEmail() {
    setTestEmailStatus('sending');
    try {
      const result = await api.post('/logs/test-email', { institutionId: id, testRecipient: testEmailRecipient });
      setTestEmailStatus(result.status);
    } catch {
      setTestEmailStatus('failed');
    }
  }

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title={isEdit ? 'Edit Institution' : 'Add Institution'}>
      <PageHeader
        title={isEdit ? 'Edit Institution' : 'Add Institution'}
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin/dashboard' },
          { label: 'Institutions', to: '/admin/institutions' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />
      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Section title="Basic Information">
          <Row>
            <Input label="Institution Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
            <Input label="Short Name / Abbreviation" value={form.shortName} onChange={e => set('shortName', e.target.value)} placeholder="e.g. UNILAG" />
          </Row>
          <Row>
            <Input label="Slug (URL identifier) *" value={form.slug} onChange={e => set('slug', e.target.value)} required placeholder="e.g. unilag" />
            <Input label="Country" value={form.country} onChange={e => set('country', e.target.value)} />
          </Row>
          <Row>
            <Input label="State" value={form.state} onChange={e => set('state', e.target.value)} />
            <Input label="Website" type="url" value={form.website} onChange={e => set('website', e.target.value)} />
          </Row>
          <Row>
            <Input label="Contact Email" type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
            <Input label="Contact Phone" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
          </Row>
          <Textarea label="Address" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
        </Section>

        <Section title="Branding">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Row>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Primary Colour</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <Input value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} placeholder="#7B1C1C" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Secondary Colour</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.secondaryColor} onChange={e => set('secondaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border" />
                    <Input value={form.secondaryColor} onChange={e => set('secondaryColor', e.target.value)} placeholder="#C9930A" />
                  </div>
                </div>
              </Row>
            </div>
            {/* Live preview */}
            <div className="rounded-xl overflow-hidden border border-border h-28 flex">
              <div style={{ background: form.primaryColor }} className="w-16 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                <div style={{ background: form.secondaryColor }} className="w-7 h-7 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⚖</span>
                </div>
                <span className="text-xs text-white/80">Preview</span>
              </div>
              <div className="flex-1 bg-cream p-3 flex flex-col justify-center">
                <p className="text-xs font-semibold text-ink" style={{ color: form.primaryColor }}>{form.shortName || form.name || 'Institution'}</p>
                <p className="text-xs text-muted">Disciplinary System</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Email Integration (SMTP)">
          <Row>
            <Input label="SMTP Host" value={form.smtpHost} onChange={e => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
            <Input label="SMTP Port" type="number" value={form.smtpPort} onChange={e => set('smtpPort', Number(e.target.value))} />
          </Row>
          <Row>
            <Input label="SMTP Username" value={form.smtpUser} onChange={e => set('smtpUser', e.target.value)} />
            <Input label="SMTP Password" type="password" value={form.smtpPass} onChange={e => set('smtpPass', e.target.value)} />
          </Row>
          <Row>
            <Input label="From Name" value={form.emailFromName} onChange={e => set('emailFromName', e.target.value)} />
            <Input label="From Email Address" type="email" value={form.emailFromAddr} onChange={e => set('emailFromAddr', e.target.value)} />
          </Row>
          {isEdit && (
            <div className="flex gap-3 items-end">
              <Input label="Test recipient email" value={testEmailRecipient} onChange={e => setTestEmailRecipient(e.target.value)} type="email" placeholder="test@example.com" />
              <Button type="button" variant="secondary" onClick={sendTestEmail} loading={testEmailStatus === 'sending'}>
                Send Test Email
              </Button>
              {testEmailStatus === 'success' && <span className="text-sm text-green-700">✓ Sent</span>}
              {testEmailStatus === 'failed'  && <span className="text-sm text-red-600">✗ Failed</span>}
            </div>
          )}
        </Section>

        <Section title="SMS Integration">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="smsEnabled" checked={form.smsEnabled} onChange={e => set('smsEnabled', e.target.checked)}
              className="w-4 h-4 accent-maroon rounded" />
            <label htmlFor="smsEnabled" className="text-sm font-medium text-ink cursor-pointer">Enable SMS Gateway</label>
          </div>
          {form.smsEnabled && (
            <Input label="SMS Sender ID" value={form.smsSenderId} onChange={e => set('smsSenderId', e.target.value)} placeholder="e.g. UNILAG" />
          )}
        </Section>

        <Section title="SIS Integration">
          <Row>
            <Input label="SIS API URL" type="url" value={form.sisApiUrl} onChange={e => set('sisApiUrl', e.target.value)} />
            <Input label="SIS API Key" type="password" value={form.sisApiKey} onChange={e => set('sisApiKey', e.target.value)} />
          </Row>
        </Section>

        <Section title="Licence & Contract">
          <Row>
            <Select label="Licence Status" value={form.licenceStatus} onChange={e => set('licenceStatus', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </Select>
            <Input label="Contract Reference" value={form.contractRef} onChange={e => set('contractRef', e.target.value)} />
          </Row>
          <Row>
            <Input label="Licence Start" type="date" value={form.licenceStart?.slice(0, 10) || ''} onChange={e => set('licenceStart', e.target.value)} />
            <Input label="Licence End" type="date" value={form.licenceEnd?.slice(0, 10) || ''} onChange={e => set('licenceEnd', e.target.value)} />
          </Row>
          <Textarea label="Internal Notes (Reforma only)" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Section>

        <div className="sticky bottom-0 bg-cream border-t border-border py-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/institutions')}>Cancel</Button>
          <Button type="submit" loading={submitting}>Save Institution</Button>
        </div>
      </form>
    </AdminLayout>
  );
}
