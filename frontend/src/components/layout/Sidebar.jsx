import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, onTabChange }) {
    const { userRole, logout } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    const canSeeDashboard = role === 'ADMIN' || role === 'MANAGER';
    const canSeeUserMgmt = role === 'ADMIN';

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Error during logout:", err);
        }
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
                {canSeeDashboard && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => onTabChange('dashboard')}
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span>Bảng điều khiển</span>
                    </button>
                )}

                {/* NÚT QUẢN LÝ THÈ & VÉ PHẲNG - KHÔNG SỔ XUỐNG */}
                {canSeeDashboard && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'card-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('card-management')}
                    >
                        <span className="material-symbols-outlined">credit_card</span>
                        <span>Quản lý Thẻ</span>
                    </button>
                )}
                <button
                    type="button"
                    className={`menu-item ${activeTab === 'log-management' ? 'active' : ''}`}
                    onClick={() => onTabChange('log-management')}
                >
                    <span className="material-symbols-outlined">history</span>
                    <span>Nhật ký vận hành</span>
                </button>

                <button
                    type="button"
                    className={`menu-item ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => onTabChange('system')}
                >
                    <span className="material-symbols-outlined">business_center</span>
                    <span>Nghiệp vụ hệ thống</span>
                </button>

                {canSeeUserMgmt && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'user-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('user-management')}
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