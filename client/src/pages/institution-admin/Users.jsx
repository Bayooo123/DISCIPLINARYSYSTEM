import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import { formatDateTime } from '../../utils/formatters';

const INVITE_ROLES = ['COMMITTEE_MEMBER', 'PANEL_MEMBER', 'COMPLAINTS_OFFICER', 'INSTITUTION_ADMIN'];

export default function Users() {
  const { user } = useAuth();
  const iid = user?.institutionId;

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [panelOpen, setPanelOpen]   = useState(false);

  function loadUsers() {
    api.get(`/institutions/${iid}/users`)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(() => { if (iid) loadUsers(); }, [iid]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchRole   = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter
      || (statusFilter === 'active'  &&  u.isActive && u.inviteAccepted)
      || (statusFilter === 'pending' && !u.inviteAccepted)
      || (statusFilter === 'inactive' && !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  function openPanel(u) { setSelected(u); setPanelOpen(true); }

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title="Users" isInstitution>
      <PageHeader
        title="Users"
        subtitle={`${users.length} registered users`}
        breadcrumbs={[{ label: 'Dashboard', to: '/institution/dashboard' }, { label: 'Users' }]}
        actions={<Button onClick={() => setInviteOpen(true)} variant="gold">+ Invite User</Button>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {INVITE_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-border">
            <tr>
              {['User', 'Role', 'Status', 'Department', 'Last Login', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-cream cursor-pointer" onClick={() => openPanel(u)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={u.firstName} lastName={u.lastName} role={u.role} size="sm" />
                    <div>
                      <p className="font-medium text-ink">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3"><StatusBadge active={u.isActive} pendingInvite={!u.inviteAccepted} /></td>
                <td className="px-4 py-3 text-muted text-xs">{u.department || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{formatDateTime(u.lastLoginAt)}</td>
                <td className="px-4 py-3 text-maroon text-xs font-medium">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">No users match your filters.</div>
        )}
      </div>

      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        institutionId={iid}
        onSuccess={() => { setInviteOpen(false); loadUsers(); }}
      />

      {selected && (
        <UserDetailPanel
          user={selected}
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          institutionId={iid}
          onSuccess={() => { setPanelOpen(false); loadUsers(); }}
        />
      )}
    </AdminLayout>
  );
}

function InviteModal({ isOpen, onClose, institutionId, onSuccess }) {
  const [form, setForm]     = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'COMMITTEE_MEMBER', department: '', jobTitle: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/institutions/${institutionId}/users`, form);
      onSuccess();
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'COMMITTEE_MEMBER', department: '', jobTitle: '' });
    } catch (err) {
      setError(err.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite User" subtitle="They'll receive an email to set their password.">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
          <Input label="Last Name *"  value={form.lastName}  onChange={e => set('lastName', e.target.value)} required />
        </div>
        <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
        <Select label="Role *" value={form.role} onChange={e => set('role', e.target.value)}>
          {INVITE_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </Select>
        <Input label="Department / Faculty" value={form.department} onChange={e => set('department', e.target.value)} />
        <Input label="Job Title" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
        <Button type="submit" fullWidth loading={loading}>Send Invitation</Button>
      </form>
    </Modal>
  );
}

function UserDetailPanel({ user: u, isOpen, onClose, institutionId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    setLoading(true);
    try {
      await api.patch(`/institutions/${institutionId}/users/${u.id}/status`, { isActive: !u.isActive });
      onSuccess();
    } catch {} finally { setLoading(false); }
  }

  async function resendInvite() {
    setLoading(true);
    try {
      await api.post(`/institutions/${institutionId}/users/${u.id}/resend-invite`);
      alert('Invitation resent');
    } catch {} finally { setLoading(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar firstName={u.firstName} lastName={u.lastName} role={u.role} size="lg" />
          <div>
            <p className="font-semibold text-ink text-base">{u.firstName} {u.lastName}</p>
            <p className="text-sm text-muted">{u.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Role"       value={<RoleBadge role={u.role} />} />
          <Detail label="Status"     value={<StatusBadge active={u.isActive} pendingInvite={!u.inviteAccepted} />} />
          <Detail label="Department" value={u.department} />
          <Detail label="Job Title"  value={u.jobTitle} />
          <Detail label="Phone"      value={u.phone} />
          <Detail label="Last Login" value={formatDateTime(u.lastLoginAt)} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="sm" loading={loading} onClick={deactivate}>
            {u.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
          {!u.inviteAccepted && (
            <Button variant="ghost" size="sm" loading={loading} onClick={resendInvite}>
              Resend Invitation
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase font-medium">{label}</p>
      <div className="text-sm text-ink mt-0.5">{value || '—'}</div>
    </div>
  );
}
