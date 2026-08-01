// Import Routes và Route từ react-router-dom để khai báo cấu trúc điều hướng
// Navigate dùng để redirect tự động tới một route khác
import { Routes, Route, Navigate } from 'react-router-dom';
// Import trang Đăng nhập
import LoginPage from './features/auth/pages/LoginPage';
// Import trang Dashboard tổng hợp (điều phối hiển thị các view con)
import DashboardView from './features/dashboard/pages/DashboardView';
// Import trang quản lý Thẻ lượt (casual card)
import CardPage from './features/dashboard/pages/CardPage';
// Import trang quản lý Thẻ tháng (monthly card)
import MonthCardPage from './features/dashboard/pages/MonthCardPage';
// Import trang Nhật ký Báo mất thẻ
import LostCardLogPage from './features/dashboard/pages/LostCardLogPage';
// Import trang Nhật ký Đăng nhập hệ thống
import LoginLogPage from './features/dashboard/pages/LoginLogPage';
// Import trang Nhật ký giao dịch Thẻ tháng
import MonthCardLogPage from './features/dashboard/pages/MonthCardLogPage';
// Import trang Quản lý người dùng / Phân quyền (chỉ Admin)
import UserManagementPage from './features/dashboard/pages/UserManagementPage';
// Import trang Điều chỉnh biểu giá (chỉ Manager)
import AdjustPricesPage from './features/dashboard/pages/AdjustPricesPage';
// Import ProtectedRoute: guard yêu cầu đăng nhập mới được vào (kiểm tra token)
import ProtectedRoute from './components/auth/ProtectedRoute';
// Import RoleProtectedRoute: guard yêu cầu đúng role mới được vào (ADMIN, MANAGER, STAFF)
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
// Import trang biểu đồ tỷ lệ chiếm dụng bãi xe (OccupancyChart)
import OccupancyChart from './features/dashboard/pages/OccupancyChart';
// Import trang Quên mật khẩu
import ForgotPassword from "./features/auth/pages/ForgotPassword";
// Import trang Đặt lại mật khẩu (sau khi nhấn link email reset)
import ResetPassword from "./features/auth/pages/ResetPassword";
// Import CSS global (design tokens, base styles, utility classes)
import "./styles/App.css";
// Import trang Đặt mật khẩu lần đầu (dành cho nhân viên được invite qua email)
import SetPasswordPage from './features/auth/pages/SetPasswordPage';
// Import trang kết quả thanh toán (sau khi VNPay redirect về)
import PaymentResultPage from './features/dashboard/pages/PaymentResultPage';
// Import trang công khai để khách hàng ký hợp đồng qua link email
import ContractSignPage from './features/dashboard/pages/ContractSignPage';

// Component gốc chứa toàn bộ cấu hình routes của ứng dụng
export default function App() {
  return (
    // Routes: container chứa tất cả các Route, chỉ render route khớp với URL hiện tại
    <Routes>
      {/* =========================================================================
          SỬA LỖI TRẮNG TRANG: Tự động chuyển hướng từ đường dẫn gốc "/" về "/login"
         ========================================================================= */}
      {/* Khi truy cập "/" (root), tự động redirect về "/login" */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 1. Trang Đăng nhập và Khôi phục mật khẩu */}
      {/* Trang đăng nhập chính (email/password và Google OAuth) */}
      <Route path="/login" element={<LoginPage />} />
      {/* Trang yêu cầu gửi email reset mật khẩu */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Trang nhập mật khẩu mới sau khi click link trong email */}
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Redirect /dashboard (không có /login prefix) về đúng URL dashboard */}
      <Route path="/dashboard" element={<Navigate to="/login/dashboard" replace />} />
      {/* Redirect mọi sub-route /dashboard/* về dashboard chuẩn */}
      <Route path="/dashboard/*" element={<Navigate to="/login/dashboard" replace />} />

      {/* 2. Các trang thuộc Bảng điều khiển — được bảo vệ, yêu cầu đăng nhập và phân quyền */}
      {/* Route dashboard chính — bọc bởi ProtectedRoute (phải có token mới vào được) */}
      <Route path="/login/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />

      {/* Route riêng cho Quản lý Thẻ lượt — chỉ ADMIN hoặc MANAGER mới được vào */}
      <Route path="/login/dashboard/card" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            {/* Mở DashboardView đã mở sẵn tab "card-management" và sub-tab "Thẻ lượt" */}
            <DashboardView initialView="card-management" initialCardTab="Thẻ lượt" />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      {/* Route riêng cho Quản lý Thẻ tháng — chỉ ADMIN hoặc MANAGER mới được vào */}
      <Route path="/login/dashboard/month-card" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            {/* Mở DashboardView đã mở sẵn tab "card-management" và sub-tab "Thẻ tháng" */}
            <DashboardView initialView="card-management" initialCardTab="Thẻ tháng" />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

      {/* Route riêng cho F1 - Thống kê hoạt động bãi xe (biểu đồ chiếm dụng) */}
      <Route path="/login/dashboard/OccupancyChart" element={
        <ProtectedRoute>
          <OccupancyChart />
        </ProtectedRoute>
      } />

      {/* Route riêng cho F2 - Nhật ký báo mất thẻ (showBackButton=true để hiển thị nút quay lại) */}
      <Route path="/login/dashboard/lost-card-log" element={
        <ProtectedRoute>
          <LostCardLogPage showBackButton={true} />
        </ProtectedRoute>
      } />

      {/* Catch-all cho các sub-route khác trong Dashboard (ví dụ: /login/dashboard/anything) */}
      <Route path="/login/dashboard/*" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />

      {/* Trang đặt mật khẩu lần đầu cho nhân viên được invite — không cần đăng nhập */}
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* Trang kết quả thanh toán VNPay — có thể có hoặc không có orderCode trên URL */}
      <Route path="/payment-result" element={<PaymentResultPage />} />
      <Route path="/payment-result/:orderCode" element={<PaymentResultPage />} />
      {/* Trang ký hợp đồng công khai — khách hàng truy cập qua link email có token */}
      <Route path="/sign-contract/:token" element={<ContractSignPage />} />

      {/* 3. Bắt lỗi: Nếu gõ link bậy bạ, tự động đá về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}