import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardView from './features/dashboard/pages/DashboardView';
import CardPage from './features/dashboard/pages/CardPage';
import MonthCardPage from './features/dashboard/pages/MonthCardPage';
import LostCardLogPage from './features/dashboard/pages/LostCardLogPage';
import LoginLogPage from './features/dashboard/pages/LoginLogPage';
import MonthCardLogPage from './features/dashboard/pages/MonthCardLogPage';
import SystemSettingsPage from './features/dashboard/pages/SystemSettingsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

import "./styles/App.css";
import SystemOperations from './features/dashboard/components/SystemOperations';
import GeneralStatisticsTable from './features/dashboard/components/Generalstatistictable';

export default function App() {
  return (
    <Routes>
      {/* 1. Trang Đăng nhập */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Các trang thuộc Bảng điều khiển — được bảo vệ, yêu cầu đăng nhập */}
      <Route path="/login/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
      <Route path="/login/dashboard/card" element={<ProtectedRoute><CardPage /></ProtectedRoute>} />
      <Route path="/login/dashboard/month-card" element={<ProtectedRoute><MonthCardPage /></ProtectedRoute>} />
      <Route path="/login/dashboard/lost-card-log" element={<ProtectedRoute><LostCardLogPage /></ProtectedRoute>} />
      <Route path="/login/dashboard/login-log" element={<ProtectedRoute><LoginLogPage /></ProtectedRoute>} />
      <Route path="/login/dashboard/month-card-log" element={<ProtectedRoute><MonthCardLogPage /></ProtectedRoute>} />
      <Route path="/login/dashboard/settings" element={<ProtectedRoute><SystemSettingsPage /></ProtectedRoute>} />

      {/* 3. Bắt lỗi: Nếu gõ link bậy bạ, tự động đá về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}