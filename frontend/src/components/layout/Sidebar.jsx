import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, onTabChange, isCollapsed, setIsCollapsed }) {
    const { user, userRole, logout } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;
    const userEmail = user?.email || 'admin@parkflow.com';

    const email = userEmail.toLowerCase().trim();
    let computedRole = role;
    if (email === 'admin@gmail.com') computedRole = 'ADMIN';
    else if (email === 'manager@gmail.com') computedRole = 'MANAGER';
    else if (email === 'staff@gmail.com') computedRole = 'STAFF';

    const canSeeDashboard = computedRole === 'ADMIN' || computedRole === 'MANAGER';
    const canSeeUserMgmt = computedRole === 'ADMIN';

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
                            <span className="material-symbols-outlined">menu</span>
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
                            <span className="material-symbols-outlined">menu_open</span>
                        </button>
                    </>
                )}
            </div>

            <nav className="menu">
                {/* 1. Phân quyền (Chỉ Admin) */}
                {computedRole === 'ADMIN' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'user-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('user-management')}
                    >
                        <span className="material-symbols-outlined">manage_accounts</span>
                        {!isCollapsed && <span>Phân quyền</span>}
                    </button>
                )}

                {/* 2. Bảng điều khiển (Chỉ Admin) */}
                {computedRole === 'ADMIN' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => onTabChange('dashboard')}
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        {!isCollapsed && <span>Bảng điều khiển</span>}
                    </button>
                )}

                {/* 3. Bảng điều khiển (Chỉ Manager) */}
                {computedRole === 'MANAGER' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'manager-dashboard' ? 'active' : ''}`}
                        onClick={() => onTabChange('manager-dashboard')}
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        {!isCollapsed && <span>Bảng điều khiển</span>}
                    </button>
                )}

                {/* 4. Quản lý Thẻ (Chỉ Manager) */}
                {computedRole === 'MANAGER' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'card-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('card-management')}
                    >
                        <span className="material-symbols-outlined">badge</span>
                        {!isCollapsed && <span>Quản lý Thẻ</span>}
                    </button>
                )}

                {/* 4. Điều chỉnh giá (Chỉ Manager) */}
                {computedRole === 'MANAGER' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'adjust-prices' ? 'active' : ''}`}
                        onClick={() => onTabChange('adjust-prices')}
                    >
                        <span className="material-symbols-outlined">price_change</span>
                        {!isCollapsed && <span>Điều chỉnh giá</span>}
                    </button>
                )}

                {/* 5. Nhật ký vận hành (Chỉ Manager) */}
                {computedRole === 'MANAGER' && (
                    <button
                        type="button"
                        className={`menu-item ${activeTab === 'log-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('log-management')}
                    >
                        <span className="material-symbols-outlined">history</span>
                        {!isCollapsed && <span>Nhật ký vận hành</span>}
                    </button>
                )}


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