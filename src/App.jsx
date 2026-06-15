import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RouteGuard from './routes/RouteGuard';
import DashboardShell from './layouts/DashboardShell';

// Lazy load route pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import Slots from './pages/Slots';
import Users from './pages/Users';
import Pricing from './pages/Pricing';
import Exceptions from './pages/Exceptions';
import ForgotPassword from './pages/ForgotPassword';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import Buildings from './pages/Buildings';
import Vehicles from './pages/Vehicles';
import Reports from './pages/Reports';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected dashboard shell */}
          <Route
            path="/"
            element={
              <RouteGuard>
                <DashboardShell />
              </RouteGuard>
            }
          >
            {/* Fallback to user console depending on role */}
            <Route index element={<Navigate to="/sessions" replace />} />
            
            {/* Staff / Manager / Admin Console */}
            <Route path="sessions" element={<Sessions />} />
            
            {/* Staff / Manager / Admin Slots Map */}
            <Route path="slots" element={<Slots />} />

            {/* Manager / Admin metrics */}
            <Route
              path="dashboard"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Dashboard />
                </RouteGuard>
              }
            />

            {/* Manager / Admin exception override audits */}
            <Route
              path="exceptions"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Exceptions />
                </RouteGuard>
              }
            />

            {/* Manager / Admin pricing setups */}
            <Route
              path="pricing"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Pricing />
                </RouteGuard>
              }
            />

            {/* Manager / Admin building structures */}
            <Route
              path="buildings"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Buildings />
                </RouteGuard>
              }
            />

            {/* Manager / Admin vehicle classifications */}
            <Route
              path="vehicles"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Vehicles />
                </RouteGuard>
              }
            />

            {/* Manager / Admin analytics reports */}
            <Route
              path="reports"
              element={
                <RouteGuard allowedRoles={['ADMIN', 'MANAGER']}>
                  <Reports />
                </RouteGuard>
              }
            />

            {/* Admin only users management */}
            <Route
              path="users"
              element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <Users />
                </RouteGuard>
              }
            />

            {/* Admin only roles permission matrix */}
            <Route
              path="roles"
              element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <Roles />
                </RouteGuard>
              }
            />

            {/* Admin only global system settings */}
            <Route
              path="settings"
              element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <Settings />
                </RouteGuard>
              }
            />
          </Route>

          {/* Fallback all redirects */}
          <Route path="*" element={<Navigate to="/sessions" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
