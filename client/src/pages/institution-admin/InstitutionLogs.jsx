import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/ui/AdminLayout';
import PageHeader from '../../components/ui/PageHeader';
import SystemLogs from '../reforma-admin/SystemLogs';

export default function InstitutionLogs() {
  const { user } = useAuth();
  return (
    <AdminLayout title="System Logs" isInstitution>
      <PageHeader
        title="System Logs"
        breadcrumbs={[{ label: 'Dashboard', to: '/institution/dashboard' }, { label: 'System Logs' }]}
      />
      <SystemLogs institutionId={user?.institutionId} embedded />
    </AdminLayout>
  );
}
