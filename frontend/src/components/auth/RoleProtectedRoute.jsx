// Import Navigate từ react-router-dom để redirect người dùng về route khác
import { Navigate } from 'react-router-dom';
// Import useAuth hook để đọc thông tin đăng nhập (user, userRole) từ AuthContext
import { useAuth } from '../../context/AuthContext';

/**
 * RoleProtectedRoute - Bảo vệ route theo role.
 * Nếu chưa đăng nhập → redirect /login
 * Nếu role không được phép → redirect /login/dashboard
 *
 * @param {string[]} allowedRoles - Danh sách role được phép truy cập
 */
export default function RoleProtectedRoute({ children, allowedRoles }) {
    // Kiểm tra token trong localStorage (có thể được lưu bởi 3 key khác nhau — đảm bảo tương thích)
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    // Lấy thông tin user và role từ AuthContext
    const { user, userRole } = useAuth();

    // Nếu không có token thì chưa đăng nhập → redirect về trang login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Đọc role từ localStorage (ưu tiên) hoặc từ AuthContext state
    const savedRole = localStorage.getItem("userRole") || userRole;
    // Lấy email của user, xử lý thành chữ thường và cắt khoảng trắng để so sánh chính xác
    const email = user?.email ? user.email.toLowerCase().trim() : (localStorage.getItem("userEmail") || '').toLowerCase().trim();
    // Chuyển role thành chữ hoa để so sánh case-insensitive
    let role = savedRole ? savedRole.toUpperCase() : null;
    // Override role theo email cứng — phục vụ môi trường demo/dev với tài khoản test
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    // Nếu chưa load xong role thì fallback về savedRole hoặc STAFF để không làm văng phiên
    if (!role) {
        role = 'STAFF';
    }

    // Nếu role hiện tại không nằm trong danh sách allowedRoles → redirect về dashboard (không có quyền)
    if (!allowedRoles.includes(role)) {
        return <Navigate to="/login/dashboard" replace />;
    }

    // Có đủ quyền → render component con được bảo vệ
    return children;
}
