import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - Bảo vệ các route yêu cầu đăng nhập.
 * Nếu chưa có token trong localStorage, tự động redirect về /login.
 * Dùng `replace` để xóa history entry, người dùng không thể nhấn Back để quay lại dashboard.
 */
export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
