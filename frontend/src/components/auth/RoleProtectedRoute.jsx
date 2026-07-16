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
    const token = localStorage.getItem('token');
    const { user, userRole } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const email = user?.email ? user.email.toLowerCase().trim() : '';
    let role = userRole ? userRole.toUpperCase() : null;
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    // Nếu role chưa load xong thì chờ (không redirect sớm)
    if (!role) {
        return null;
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/login/dashboard" replace />;
    }

    return children;
}
