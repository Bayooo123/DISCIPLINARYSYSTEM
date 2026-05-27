import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Textarea, Select } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { OFFENCE_CATEGORIES } from '../../utils/constants';

export default function OffenceTypes() {
  const { user } = useAuth();
  const iid = user?.institutionId;
  const [types, setTypes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);

  function load() {
    api.get(`/institutions/${iid}/offence-types`)
      .then(setTypes).catch(console.error).finally(() => setLoading(false));
  }
  useEffect(() => { if (iid) load(); }, [iid]);

  async function toggleActive(t) {
    await api.patch(`/institutions/${iid}/offence-types/${t.id}`, { isActive: !t.isActive });
    load();
  }

  const byCategory = OFFENCE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = types.filter(t => t.category === cat);
    return acc;
  }, {});

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title="Offence Types" isInstitution>
      <PageHeader
        title="Offence Types"
        subtitle="Configure disciplinary offence categories for your institution"
        breadcrumbs={[{ label: 'Dashboard', to: '/institution/dashboard' }, { label: 'Offence Types' }]}
        actions={<Button variant="gold" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Add Offence Type</Button>}
      />

      <div className="space-y-5">
        {OFFENCE_CATEGORIES.map(cat => {
          const catTypes = byCategory[cat] || [];
          if (!catTypes.length) return null;
          return (
            <div key={cat} className="bg-white border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">{cat}</h3>
              <div className="space-y-2">
                {catTypes.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:border-maroon/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-ink">{t.name}</p>
                      {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setEditing(t); setModalOpen(true); }}
                        className="text-xs text-muted hover:text-ink transition-colors"
                      >
                        Edit
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only" checked={t.isActive} onChange={() => toggleActive(t)} />
                        <div className={`w-9 h-5 rounded-full transition-colors ${t.isActive ? 'bg-maroon' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${t.isActive ? 'translate-x-4' : ''}`} />
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <OffenceTypeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        institutionId={iid}
        existing={editing}
        onSuccess={() => { setModalOpen(false); load(); }}
      />
    </AdminLayout>
  );
}

function OffenceTypeModal({ isOpen, onClose, institutionId, existing, onSuccess }) {
  const [form, setForm]       = useState({ name: '', category: 'Academic', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (existing) setForm({ name: existing.name, category: existing.category, description: existing.description || '' });
    else          setForm({ name: '', category: 'Academic', description: '' });
  }, [existing, isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (existing) {
        await api.patch(`/institutions/${institutionId}/offence-types/${existing.id}`, form);
      } else {
        await api.post(`/institutions/${institutionId}/offence-types`, form);
      }
      onSuccess();
    } catch (err) {
      setError(err.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Offence Type' : 'Add Offence Type'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Select label="Category *" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {OFFENCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Button type="submit" fullWidth loading={loading}>{existing ? 'Save Changes' : 'Add Offence Type'}</Button>
      </form>
    </Modal>
  );
}
