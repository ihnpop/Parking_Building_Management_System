// Import StrictMode để phát hiện lỗi tiềm ẩn trong development; useState và useEffect để quản lý state và side-effect
import { StrictMode, useState, useEffect } from 'react'
// Import createRoot để mount ứng dụng React vào DOM element có id="root"
import { createRoot } from 'react-dom/client'
// Import HashRouter để dùng routing dựa trên URL hash (#), giúp SPA hoạt động đúng khi deploy lên server tĩnh
import { HashRouter } from "react-router-dom";
// Import AuthProvider để bọc toàn bộ app, cung cấp thông tin đăng nhập cho mọi component con
import { AuthProvider } from './context/AuthContext'
// Import NotificationProvider để cung cấp hệ thống toast và dialog xác nhận toàn app
import { NotificationProvider } from './context/NotificationContext'
// Import client Supabase để gọi getSession() trong luồng xử lý OAuth redirect
import supabase from './config/supabaseClient';

// Import CSS toàn cục (reset, biến CSS, font chữ)
import './styles/index.css';
// Import CSS App (design system, các style dùng chung)
import './styles/App.css';
// Import component gốc chứa toàn bộ Routes của ứng dụng
import App from './App.jsx'

// Component trung gian xử lý luồng OAuth redirect và set-password của Supabase trước khi render App chính
function MainApp() {
  // Khởi tạo state kiểm tra có đang trong luồng redirect OAuth/invite/recovery không
  // Hàm khởi tạo lazy: chạy 1 lần khi component mount để kiểm tra URL hiện tại
  const [isProcessingAuth, setIsProcessingAuth] = useState(() => {
    // Lấy hash (#...) của URL hiện tại để phát hiện access_token từ Supabase redirect
    const hash = window.location.hash || "";

    // Lấy query string (?...) của URL hiện tại
    const search = window.location.search || "";
    // Lấy pathname của URL
    const pathname = window.location.pathname || "";
    // Lấy toàn bộ URL đầy đủ để kiểm tra các trường hợp edge case
    const href = window.location.href || "";

    // Phát hiện người dùng quay lại từ Supabase Auth redirect (Google OAuth, Reset Password, hoặc Invite)
    return hash.includes("access_token=") ||
      href.includes("type=invite") ||
      href.includes("type=recovery") ||
      pathname.includes("set-password") ||
      search.includes("type=invite");
  });

  // Khi isProcessingAuth = true, chạy hiệu ứng chờ và xử lý route phù hợp
  useEffect(() => {
    // Nếu không phải luồng auth redirect thì không làm gì
    if (!isProcessingAuth) return;

    // Hàm bất đồng bộ phân tích URL và redirect tới route đúng
    const checkAuth = async () => {
      // Đọc lại các phần của URL sau khi timeout (vì Supabase cần thời gian xử lý hash)
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const pathname = window.location.pathname || "";
      const href = window.location.href || "";

      // Mặc định redirect về dashboard sau khi OAuth thành công
      let targetRoute = "#/login/dashboard";

      // Bắt chính xác luồng đặt mật khẩu mới cho nhân viên được mời (Invite)
      if (
        pathname.includes("set-password") ||
        href.includes("set-password") ||
        href.includes("type=invite") ||
        hash.includes("type=invite") ||
        search.includes("type=invite")
      ) {
        // Redirect tới trang đặt mật khẩu lần đầu (nhân viên được invite)
        targetRoute = "#/set-password";
      } else if (
        pathname.includes("reset-password") ||
        href.includes("reset-password") ||
        href.includes("type=recovery") ||
        hash.includes("type=recovery") ||
        search.includes("type=recovery")
      ) {
        // Redirect tới trang reset mật khẩu (quên mật khẩu)
        targetRoute = "#/reset-password";
      }

      try {
        // Chờ Supabase bóc tách token và lưu thông tin phiên đăng nhập
        const { data: { session } } = await supabase.auth.getSession();
        console.log("OAuth/Invite Session retrieved successfully:", session);
      } catch (err) {
        // Ghi log lỗi nếu không lấy được session từ Supabase
        console.error("Error processing Auth redirect:", err);
      } finally {
        // Chuyển hướng tới hash route phù hợp (ví dụ: #/set-password)
        window.location.hash = targetRoute;
        // Tắt màn hình loading auth redirect
        setIsProcessingAuth(false);
      }
    };

    // Đợi Supabase giải mã hash parameters
    // Timeout 1200ms để đảm bảo Supabase JS SDK đã hoàn thành xử lý token trong URL fragment
    const timer = setTimeout(() => {
      checkAuth();
    }, 1200);

    // Cleanup: hủy timeout nếu component unmount trước khi timeout chạy xong
    return () => clearTimeout(timer);
  }, [isProcessingAuth]); // Chạy lại khi isProcessingAuth thay đổi

  // Nếu đang trong luồng xử lý auth redirect, hiển thị màn hình loading thay vì app chính
  if (isProcessingAuth) {
    return (
      // Màn hình loading full-screen với nền tối
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',          // Chiếm toàn bộ chiều cao màn hình
        background: '#0f172a',    // Nền tối navy
        color: '#f8fafc',         // Chữ trắng
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Spinner xoay vòng */}
        <div className="animate-spin" style={{
          width: '50px',
          height: '50px',
          border: '4px solid #3b82f6',          // Viền màu xanh dương
          borderTopColor: 'transparent',          // Để tạo hiệu ứng spinner xoay
          borderRadius: '50%',
          marginBottom: '20px'
        }}></div>
        {/* Tiêu đề thông báo đang xử lý */}
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Đang xử lý đăng nhập với Google...</h3>
        {/* Hướng dẫn chờ */}
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>Vui lòng đợi trong giây lát</p>
        {/* Inject CSS animation spin vào inline style vì global CSS có thể chưa load */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}} />
      </div>
    );
  }

  // Render cây component chính khi không có luồng auth redirect nào
  return (
    // HashRouter: toàn bộ routing dùng URL hash (#/path)
    <HashRouter>
      {/* AuthProvider: cung cấp user, userRole, login/logout cho toàn cây component */}
      <AuthProvider>
        {/* NotificationProvider: cung cấp showToast, showConfirm, showPrompt cho toàn cây */}
        <NotificationProvider>
          {/* App: component gốc chứa tất cả Routes */}
          <App />
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

// Mount React app vào phần tử DOM có id="root" (được định nghĩa trong index.html)
// StrictMode: bật các cảnh báo và kiểm tra bổ sung trong development mode
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MainApp />
  </StrictMode>,
)
