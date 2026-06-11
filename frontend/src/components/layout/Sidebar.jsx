import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar layout for the parking management dashboard.
 * This component is styled to match the sample on the left side.
 */
export default function Sidebar({ activeTab, onTabChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const handleLogout = async () => {
        // Gọi logout từ AuthContext: xóa Supabase session + localStorage
        await logout();
        navigate('/login', { replace: true });
    };

    // Determine the active tab based on pathname and activeTab state
    const pathname = location.pathname;
    let effectiveActiveTab = activeTab;
    if (activeTab !== 'system') {
        if (pathname.includes('/user-management')) {
            effectiveActiveTab = 'user-management';
        } else {
            effectiveActiveTab = 'dashboard';
        }
    }

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
                <button
                    type="button"
                    className={`menu-item ${effectiveActiveTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => {
                        onTabChange('dashboard');
                        navigate('/login/dashboard');
                    }}
                >
                    <span className="material-symbols-outlined">dashboard</span>
                    <span>Bảng điều khiển</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${effectiveActiveTab === 'system' ? 'active' : ''}`}
                    onClick={() => onTabChange('system')}
                >
                    <span className="material-symbols-outlined">business_center</span>
                    <span>Nghiệp vụ hệ thống</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${effectiveActiveTab === 'user-management' ? 'active' : ''}`}
                    onClick={() => {
                        onTabChange('user-management');
                        navigate('/login/dashboard/user-management');
                    }}
                >
                    <span className="material-symbols-outlined">manage_accounts</span>
                    <span>Phân quyền</span>
                </button>
            </nav>

            <button type="button" className="logout" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
            </button>
        </aside>
    )
}