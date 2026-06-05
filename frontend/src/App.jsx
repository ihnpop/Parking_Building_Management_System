import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardView from './features/dashboard/pages/DashboardView';
import CardPage from './features/dashboard/pages/CardPage';
import MonthCardPage from './features/dashboard/pages/MonthCardPage';
import SingleCardPage from './features/dashboard/pages/SingleCardPage';

import "./styles/App.css";

export default function App() {
  return (
    <Routes>
      {/* 1. Trang Đăng nhập */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Các trang thuộc Bảng điều khiển (Đã có sẵn Shell bọc bên trong) */}
      <Route path="/login/dashboard" element={<DashboardView />} />
      <Route path="/login/dashboard/card" element={<CardPage />} />
      <Route path="/login/dashboard/month-card" element={<MonthCardPage />} />
      <Route path="/login/dashboard/single-card" element={<SingleCardPage />} />

      {/* 3. Bắt lỗi: Nếu gõ link bậy bạ, tự động đá về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}