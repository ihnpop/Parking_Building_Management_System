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
    const { userRole } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Nếu role chưa load xong thì chờ (không redirect sớm)
    if (!userRole) {
        return null;
    }

    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/login/dashboard" replace />;
    }

    return children;
}
