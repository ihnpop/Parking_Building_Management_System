import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar layout for the parking management dashboard.
 * Active state được xác định bằng URL (useLocation) thay vì local state,
 * nên điều hướng giữa các trang luôn phản ánh đúng trang hiện tại.
 *
 * Phân quyền theo role:
 * - ADMIN:   Bảng điều khiển | Nghiệp vụ hệ thống | Phân quyền
 * - MANAGER: Bảng điều khiển | Nghiệp vụ hệ thống
 * - STAFF:   Nghiệp vụ hệ thống
 */
export default function Sidebar({ activeTab, onTabChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole } = useAuth();

    const isStaff = userRole === 'STAFF';
    const isAdmin = userRole === 'ADMIN';

    // Xác định active dựa vào URL + tab state
    const isUserMgmt  = location.pathname === '/login/dashboard/user-management';
    const isSystem    = activeTab === 'system';
    const isDashboard = location.pathname === '/login/dashboard' && !isSystem;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access_token');
        // Dùng replace: true để xóa lịch sử điều hướng
        navigate('/login', { replace: true });
    };

    return (
        <aside className="sidebar">
            <div className="brand">
                <div className="brand-icon">
                    <span className="material-symbols-outlined">directions_car</span>
                </div>
                <div>
                    <div className="brand-title">Quản lý Bãi xe</div>
                    <div className="brand-subtitle">Hệ thống quản trị</div>
                </div>
            </div>

            <nav className="menu">
                {/* Bảng điều khiển: ẩn với STAFF */}
                {!isStaff && (
                    <button
                        type="button"
                        className={`menu-item ${isDashboard ? 'active' : ''}`}
                        onClick={() => {
                            onTabChange('dashboard');       // tắt tab system nếu đang bật
                            navigate('/login/dashboard');   // luôn navigate về trang gốc
                        }}
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span>Bảng điều khiển</span>
                    </button>
                )}

                {/* Nghiệp vụ hệ thống: luôn hiện, là tab overlay (không đổi URL) */}
                <button
                    type="button"
                    className={`menu-item ${isSystem ? 'active' : ''}`}
                    onClick={() => onTabChange('system')}
                >
                    <span className="material-symbols-outlined">business_center</span>
                    <span>Nghiệp vụ hệ thống</span>
                </button>

                {/* Phân quyền: chỉ ADMIN, điều hướng tới trang riêng */}
                {isAdmin && (
                    <button
                        type="button"
                        className={`menu-item ${isUserMgmt ? 'active' : ''}`}
                        onClick={() => {
                            onTabChange('dashboard'); // tắt tab system nếu đang bật
                            navigate('/login/dashboard/user-management');
                        }}
                    >
                        <span className="material-symbols-outlined">manage_accounts</span>
                        <span>Phân quyền</span>
                    </button>
                )}
            </nav>

            <button type="button" className="logout" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
            </button>
        </aside>
    );
}