import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import AccessLink from './pages/AccessLink';
import Portal     from './pages/Portal';
import CaseDetail from './pages/CaseDetail';
import Submitted  from './pages/Submitted';
import './styles/student.css';

function RequireStudentAuth({ children }) {
  const { isAuthed } = useStudentAuth();
  if (!isAuthed) return (
    <div className="center-page">
      <div style={{ maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 className="font-serif" style={{ fontSize: 22, marginBottom: 8 }}>Session Expired</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Your session has expired for security reasons. Please use the original link from your email to continue.
        </p>
      </div>
    </div>
  );
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <StudentAuthProvider>
        <Routes>
          <Route path="/access/:token" element={<AccessLink />} />
          <Route path="/portal" element={<RequireStudentAuth><Portal /></RequireStudentAuth>} />
          <Route path="/portal/case/:id" element={<RequireStudentAuth><CaseDetail /></RequireStudentAuth>} />
          <Route path="/portal/case/:id/submitted" element={<RequireStudentAuth><Submitted /></RequireStudentAuth>} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </StudentAuthProvider>
    </BrowserRouter>
  );
}
