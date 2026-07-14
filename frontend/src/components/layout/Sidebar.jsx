import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, onTabChange, isCollapsed, setIsCollapsed }) {
    const { user, userRole, logout } = useAuth();
    const userEmail = user?.email || 'admin@parkflow.com';
    const email = userEmail.toLowerCase().trim();

    let role = userRole ? userRole.toUpperCase() : null;
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    let menuItems = [];
    if (role === 'ADMIN') {
        menuItems = [
            { id: 'user-management', label: 'Phân quyền', icon: 'manage_accounts' },
            { id: 'dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
            { id: 'system-settings', label: 'Cài đặt hệ thống', icon: 'settings' }
        ];
    } else if (role === 'MANAGER') {
        menuItems = [
            { id: 'card-management', label: 'Quản lý Thẻ', icon: 'badge' },
            { id: 'log-management', label: 'Nhật ký vận hành', icon: 'history' },
            { id: 'system-settings', label: 'Cài đặt hệ thống', icon: 'settings' }
        ];
    } else if (role === 'STAFF') {
        menuItems = [
            { id: 'system', label: 'Nghiệp vụ hệ thống', icon: 'business_center' }
        ];
    }

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Error during logout:", err);
        }
    };

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    const userInitials = userEmail.charAt(0).toUpperCase();

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Khối Header Sidebar cấu hình theo chuẩn hiển thị Gemini */}
            <div className="brand">
                <div className="brand-logo-zone" onClick={() => isCollapsed && setIsCollapsed(false)}>
                    <div className="brand-icon">
                        <span className="material-symbols-outlined">directions_car</span>
                    </div>

                    {/* Nút bấm này CHỈ kích hoạt hiệu ứng ẩn hiện hover khi đang THU NHỎ */}
                    {isCollapsed && (
                        <button
                            type="button"
                            className="sidebar-gemini-toggle-collapsed"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(false);
                            }}
                            title="Mở rộng"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    )}
                </div>

                {!isCollapsed && (
                    <>
                        <div className="brand-text-group">
                            <div className="brand-title">Quản lý Bãi xe</div>
                            <div className="brand-subtitle">Hệ thống quản trị</div>
                        </div>

                        {/* Khi đang MỞ RỘNG, nút bấm này LUÔN LUÔN hiển thị cố định ở bên phải cùng hàng */}
                        <button
                            type="button"
                            className="sidebar-gemini-toggle-expanded"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(true);
                            }}
                            title="Thu nhỏ"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    </>
                )}
            </div>

            <nav className="menu">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => onTabChange(item.id)}
                    >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-account-card">
                    <div className="account-avatar-circle">
                        {userInitials}
                    </div>
                    {!isCollapsed && (
                        <div className="account-info-details">
                            <div className="account-info-email" title={userEmail}>{userEmail}</div>
                            <div className="account-info-role">{getRoleLabel(role)}</div>
                        </div>
                    )}
                </div>

                <button type="button" className="logout" onClick={handleLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    {!isCollapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </aside>
    );
}