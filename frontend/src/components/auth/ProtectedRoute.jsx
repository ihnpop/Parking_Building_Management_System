import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Bảo vệ các route yêu cầu đăng nhập.
 * Yêu cầu cả trạng thái user của Supabase hoạt động và sự tồn tại của token.
 */
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const token = localStorage.getItem('token');

    // Không render component sớm khi đang khởi tạo session
    if (loading) {
        return null; 
    }

    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

