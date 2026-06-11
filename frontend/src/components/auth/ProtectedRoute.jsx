// import { Navigate } from 'react-router-dom';

// /**
//  * ProtectedRoute - Bảo vệ các route yêu cầu đăng nhập.
//  * Nếu chưa có token trong localStorage, tự động redirect về /login.
//  * Dùng `replace` để xóa history entry, người dùng không thể nhấn Back để quay lại dashboard.
//  */
// export default function ProtectedRoute({ children }) {
//     const token = localStorage.getItem('token');

//     if (!token) {
//         return <Navigate to="/login" replace />;
//     }

//     return children;
// }


import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({
    children
}) {

    const { user, loading } =
        useAuth();

    if (loading) {

        return <div>Loading...</div>;

    }

    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );

    }

    return children;
}