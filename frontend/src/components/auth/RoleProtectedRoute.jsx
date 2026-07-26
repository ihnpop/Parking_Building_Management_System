import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RoleProtectedRoute - Bảo vệ route theo role.
 * Nếu chưa đăng nhập → redirect /login
 * Nếu role không được phép → redirect /login/dashboard
 *
 * @param {string[]} allowedRoles - Danh sách role được phép truy cập
 */
export default function RoleProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    const { user, userRole } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const savedRole = localStorage.getItem("userRole") || userRole;
    const email = user?.email ? user.email.toLowerCase().trim() : (localStorage.getItem("userEmail") || '').toLowerCase().trim();
    let role = savedRole ? savedRole.toUpperCase() : null;
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    // Nếu chưa load xong role thì fallback về savedRole hoặc STAFF để không làm văng phiên
    if (!role) {
        role = 'STAFF';
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/login/dashboard" replace />;
    }

    return children;
}
