import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import AcceptInvitation from './pages/AcceptInvitation';

import StudentPortal from './pages/student/StudentPortal';
import StudentCase from './pages/student/StudentCase';

import OfficerDashboard from './pages/officer/OfficerDashboard';
import FileComplaint from './pages/officer/FileComplaint';

import CommitteeDashboard from './pages/committee/CommitteeDashboard';
import CaseDetail from './pages/committee/CaseDetail';
import ConstitutePanelPage from './pages/committee/ConstitutePanelPage';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const destinations = {
    student: '/portal',
    complaints_officer: '/officer',
    committee_member: '/committee',
    panel_member: '/committee',
    platform_admin: '/committee',
  };
  return <Navigate to={destinations[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/" element={<RoleRouter />} />

        {/* ── Student portal ─────────────────────────── */}
        <Route path="/portal" element={
          <RequireAuth roles={['student']}>
            <StudentPortal />
          </RequireAuth>
        } />
        <Route path="/portal/cases/:id" element={
          <RequireAuth roles={['student']}>
            <StudentCase />
          </RequireAuth>
        } />

        {/* ── Complaints officer ─────────────────────── */}
        <Route path="/officer" element={
          <RequireAuth roles={['complaints_officer']}>
            <OfficerDashboard />
          </RequireAuth>
        } />
        <Route path="/officer/file" element={
          <RequireAuth roles={['complaints_officer']}>
            <FileComplaint />
          </RequireAuth>
        } />

        {/* ── Committee / Panel ──────────────────────── */}
        <Route path="/committee" element={
          <RequireAuth roles={['committee_member', 'panel_member', 'platform_admin']}>
            <CommitteeDashboard />
          </RequireAuth>
        } />
        <Route path="/committee/cases/:id" element={
          <RequireAuth roles={['committee_member', 'panel_member', 'platform_admin']}>
            <CaseDetail />
          </RequireAuth>
        } />
        <Route path="/committee/cases/:id/panel" element={
          <RequireAuth roles={['committee_member', 'platform_admin']}>
            <ConstitutePanelPage />
          </RequireAuth>
        } />

        <Route path="/unauthorized" element={
          <div className="flex items-center justify-center h-screen">
            <p className="text-gray-500">You do not have permission to access this page.</p>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
