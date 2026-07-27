import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardView from './features/dashboard/pages/DashboardView';
import CardPage from './features/dashboard/pages/CardPage';
import MonthCardPage from './features/dashboard/pages/MonthCardPage';
import LostCardLogPage from './features/dashboard/pages/LostCardLogPage';
import LoginLogPage from './features/dashboard/pages/LoginLogPage';
import MonthCardLogPage from './features/dashboard/pages/MonthCardLogPage';
import UserManagementPage from './features/dashboard/pages/UserManagementPage';
import AdjustPricesPage from './features/dashboard/pages/AdjustPricesPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import OccupancyChart from './features/dashboard/pages/OccupancyChart';
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";
import "./styles/App.css";
import SetPasswordPage from './features/auth/pages/SetPasswordPage';
import PaymentResultPage from './features/dashboard/pages/PaymentResultPage';
import ContractSignPage from './features/dashboard/pages/ContractSignPage';

export default function App() {
  return (
    <Routes>
      {/* =========================================================================
          SỬA LỖI TRẮNG TRANG: Tự động chuyển hướng từ đường dẫn gốc "/" về "/login"
         ========================================================================= */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 1. Trang Đăng nhập và Khôi phục mật khẩu */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Navigate to="/login/dashboard" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/login/dashboard" replace />} />

      {/* 2. Các trang thuộc Bảng điều khiển — được bảo vệ, yêu cầu đăng nhập và phân quyền */}
      <Route path="/login/dashboard/*" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />

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
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
            <LostCardLogPage showBackButton={true} />
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



      <Route path="/login/dashboard/OccupancyChart" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
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

      <Route path="/login/dashboard/adjust-prices" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['MANAGER']}>
            <AdjustPricesPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route path="/payment-result" element={<PaymentResultPage />} />
      <Route path="/payment-result/:orderCode" element={<PaymentResultPage />} />
      <Route path="/sign-contract/:token" element={<ContractSignPage />} />

      {/* 3. Bắt lỗi: Nếu gõ link bậy bạ, tự động đá về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}