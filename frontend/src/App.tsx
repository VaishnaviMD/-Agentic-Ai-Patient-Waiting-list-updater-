import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/layout/Layout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Patient Pages
import { PatientDashboard } from './pages/patient/Dashboard';
import { BrowseDoctors } from './pages/patient/BrowseDoctors';
import { MyAppointments } from './pages/patient/MyAppointments';
import { JoinWaitlist } from './pages/patient/JoinWaitlist';
import { MyOffers } from './pages/patient/MyOffers';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DoctorsManager } from './pages/admin/DoctorsManager';
import { AppointmentsManager } from './pages/admin/AppointmentsManager';
import { WaitlistManager } from './pages/admin/WaitlistManager';
import { AgentMonitor } from './pages/admin/AgentMonitor';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard'} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Patient Routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRole="patient">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="doctors" element={<BrowseDoctors />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="waitlist" element={<JoinWaitlist />} />
            <Route path="offers" element={<MyOffers />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="doctors" element={<DoctorsManager />} />
            <Route path="appointments" element={<AppointmentsManager />} />
            <Route path="waitlist" element={<WaitlistManager />} />
            <Route path="agent-monitor" element={<AgentMonitor />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
