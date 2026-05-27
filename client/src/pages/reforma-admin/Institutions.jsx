import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { LicenceBadge } from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import { formatDate } from '../../utils/formatters';

export default function Institutions() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/institutions')
      .then(setInstitutions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = institutions.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.slug.includes(search.toLowerCase());
    const matchStatus = !statusFilter || i.licenceStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <FullPageSpinner />;

  return (
    <AdminLayout title="All Institutions">
      <PageHeader
        title="Institutions"
        subtitle={`${institutions.length} institution${institutions.length !== 1 ? 's' : ''} registered`}
        breadcrumbs={[{ label: 'Dashboard', to: '/admin/dashboard' }, { label: 'Institutions' }]}
        actions={
          <Link to="/admin/institutions/new">
            <Button variant="gold">+ Add Institution</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input placeholder="Search institutions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0
        ? <EmptyState icon="🏛️" title="No institutions found" description="Adjust your filters or add a new institution." />
        : (
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream border-b border-border">
                <tr>
                  {['Institution', 'Slug', 'Status', 'Users', 'Licence Expiry', 'Created', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(inst => (
                  <tr key={inst.id} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {inst.logoUrl
                          ? <img src={inst.logoUrl} alt="" className="w-8 h-8 rounded object-contain" />
                          : <div className="w-8 h-8 rounded bg-maroon-100 flex items-center justify-center text-maroon-700 text-xs font-bold">
                              {inst.shortName?.[0] || inst.name[0]}
                            </div>
                        }
                        <div>
                          <p className="font-medium text-ink">{inst.name}</p>
                          <p className="text-xs text-muted">{inst.shortName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{inst.slug}</td>
                    <td className="px-4 py-3"><LicenceBadge status={inst.licenceStatus} /></td>
                    <td className="px-4 py-3 text-muted">{inst._count?.users || 0}</td>
                    <td className="px-4 py-3 text-muted text-xs">{formatDate(inst.licenceEnd)}</td>
                    <td className="px-4 py-3 text-muted text-xs">{formatDate(inst.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/institutions/${inst.id}`} className="text-maroon text-xs font-medium hover:underline">View</Link>
                        <span className="text-border">|</span>
                        <Link to={`/admin/institutions/${inst.id}/edit`} className="text-muted text-xs hover:text-ink">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </AdminLayout>
  );
}
