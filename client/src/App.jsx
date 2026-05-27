import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { FullPageSpinner } from './components/ui/Spinner';

import Login              from './pages/auth/Login';
import AcceptInvitation   from './pages/auth/AcceptInvitation';

import ReformaDashboard   from './pages/reforma-admin/Dashboard';
import Institutions       from './pages/reforma-admin/Institutions';
import InstitutionForm    from './pages/reforma-admin/InstitutionForm';
import InstitutionDetail  from './pages/reforma-admin/InstitutionDetail';
import SystemLogs         from './pages/reforma-admin/SystemLogs';

import InstitutionDashboard from './pages/institution-admin/InstitutionDashboard';
import Users              from './pages/institution-admin/Users';
import OffenceTypes       from './pages/institution-admin/OffenceTypes';
import Configuration      from './pages/institution-admin/Configuration';
import InstitutionLogs    from './pages/institution-admin/InstitutionLogs';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'PLATFORM_ADMIN')    return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'INSTITUTION_ADMIN') return <Navigate to="/institution/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/"              element={<RoleRouter />} />
            <Route path="/login"         element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvitation />} />

            {/* ── Reforma Admin ──────────────────────────── */}
            <Route path="/admin/dashboard" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><ReformaDashboard /></RequireAuth>
            } />
            <Route path="/admin/institutions" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><Institutions /></RequireAuth>
            } />
            <Route path="/admin/institutions/new" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><InstitutionForm /></RequireAuth>
            } />
            <Route path="/admin/institutions/:id" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><InstitutionDetail /></RequireAuth>
            } />
            <Route path="/admin/institutions/:id/edit" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><InstitutionForm /></RequireAuth>
            } />
            <Route path="/admin/logs" element={
              <RequireAuth roles={['PLATFORM_ADMIN']}><SystemLogs /></RequireAuth>
            } />

            {/* ── Institution Admin ─────────────────────── */}
            <Route path="/institution/dashboard" element={
              <RequireAuth roles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}><InstitutionDashboard /></RequireAuth>
            } />
            <Route path="/institution/users" element={
              <RequireAuth roles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}><Users /></RequireAuth>
            } />
            <Route path="/institution/offence-types" element={
              <RequireAuth roles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}><OffenceTypes /></RequireAuth>
            } />
            <Route path="/institution/settings" element={
              <RequireAuth roles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}><Configuration /></RequireAuth>
            } />
            <Route path="/institution/logs" element={
              <RequireAuth roles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}><InstitutionLogs /></RequireAuth>
            } />

            <Route path="/unauthorized" element={
              <div className="flex items-center justify-center h-screen bg-cream">
                <div className="text-center">
                  <p className="text-2xl font-serif text-maroon mb-2">Access Denied</p>
                  <p className="text-sm text-muted">You do not have permission to access this page.</p>
                </div>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
