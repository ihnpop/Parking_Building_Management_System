import { useNavigate } from 'react-router-dom';

/**
 * Sidebar layout for the parking management dashboard.
 * This component is styled to match the sample on the left side.
 */
export default function Sidebar({ activeTab, onTabChange }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Xóa toàn bộ thông tin xác thực khỏi localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access_token');

        // Dùng replace: true để xóa lịch sử điều hướng,
        // người dùng nhấn Back sẽ không quay lại được dashboard
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
                <button
                    type="button"
                    className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => onTabChange('dashboard')}
                >
                    <span className="material-symbols-outlined">dashboard</span>
                    <span>Bảng điều khiển</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => onTabChange('system')}
                >
                    <span className="material-symbols-outlined">business_center</span>
                    <span>Nghiệp vụ hệ thống</span>
                </button>
            </nav>

            <button type="button" className="logout" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Đăng xuất</span>
            </button>
        </aside>
    )
}