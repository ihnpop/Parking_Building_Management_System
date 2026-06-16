import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardView from './features/dashboard/pages/DashboardView';
import CardPage from './features/dashboard/pages/CardPage';
import MonthCardPage from './features/dashboard/pages/MonthCardPage';
import LostCardLogPage from './features/dashboard/pages/LostCardLogPage';
import LoginLogPage from './features/dashboard/pages/LoginLogPage';
import MonthCardLogPage from './features/dashboard/pages/MonthCardLogPage';
import SystemSettingsPage from './features/dashboard/pages/SystemSettingsPage';
import UserManagementPage from './features/dashboard/pages/UserManagementPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import OccupancyChart from './features/dashboard/pages/OccupancyChart';
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";


import "./styles/App.css";


export default function App() {
  return (
    <Routes>
      {/* 1. Trang Đăng nhập */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Navigate to="/login/dashboard" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/login/dashboard" replace />} />

      {/* 2. Các trang thuộc Bảng điều khiển — được bảo vệ, yêu cầu đăng nhập và phân quyền */}
      <Route path="/login/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />

      <Route path="/login/dashboard/card" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <CardPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/month-card" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <MonthCardPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/lost-card-log" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <LostCardLogPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/login-log" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <LoginLogPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/month-card-log" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <MonthCardLogPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/settings" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <SystemSettingsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/OccupancyChart" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <OccupancyChart />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/login/dashboard/user-management" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagementPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      {/* 3. Bắt lỗi: Nếu gõ link bậy bạ, tự động đá về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>

  );
}
