// Import useAuth hook để đọc thông tin đăng nhập (user, userRole, logout) từ AuthContext
import { useAuth } from '../../context/AuthContext';
// Import CSS riêng của Sidebar component
import "./Sidebar.css";

// Sidebar: component thanh menu bên trái, hiển thị các mục điều hướng tùy theo role
// Props: activeTab (tab đang active), onTabChange (hàm xử lý đổi tab), isCollapsed (đã thu nhỏ chưa), setIsCollapsed (hàm toggle thu/mở)
export default function Sidebar({ activeTab, onTabChange, isCollapsed, setIsCollapsed }) {
    // Lấy thông tin user, role và hàm logout từ AuthContext
    const { user, userRole, logout } = useAuth();
    // Chuyển role thành chữ hoa để so sánh nhất quán, null nếu chưa có role
    const role = userRole ? userRole.toUpperCase() : null;
    // Lấy email user, dùng email demo nếu chưa đăng nhập
    const userEmail = user?.email || 'admin@parkflow.com';

    // Chuẩn hóa email: lowercase và cắt khoảng trắng
    const email = userEmail.toLowerCase().trim();
    // computedRole: role được xác định từ cả state lẫn email cứng (cho tài khoản test)
    let computedRole = role;
    // Override role theo email cứng dành cho tài khoản demo/test
    if (email === 'admin@gmail.com') computedRole = 'ADMIN';
    else if (email === 'manager@gmail.com') computedRole = 'MANAGER';
    else if (email === 'staff@gmail.com') computedRole = 'STAFF';

    // Boolean kiểm tra có được xem Bảng điều khiển (ADMIN hoặc MANAGER) không
    const canSeeDashboard = computedRole === 'ADMIN' || computedRole === 'MANAGER';
    // Boolean kiểm tra có được quản lý người dùng (chỉ ADMIN) không
    const canSeeUserMgmt = computedRole === 'ADMIN';

    // Hàm xử lý đăng xuất, bắt lỗi nếu có
    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Error during logout:", err);
        }
    };

    // Hàm chuyển đổi role code sang tiêu đề tiếng Việt để hiển thị trên UI
    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r; // Nếu là role không xác định thì trả về nguyên bản
        }
    };

    // Lấy chữ cái đầu của email làm avatar (viết hoa) để hiển thị trong khung tròn
    const userInitials = userEmail.charAt(0).toUpperCase();

    return (
        // aside: element thanh sidebar, thêm class 'collapsed' khi đang thu nhỏ
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Khối Header Sidebar cấu hình theo chuẩn hiển thị Gemini */}
            <div className="brand">
                {/* Vùng logo và icon xe — click vào khi đang thu nhỏ sẽ mở rộng lại sidebar */}
                <div className="brand-logo-zone" onClick={() => isCollapsed && setIsCollapsed(false)}>
                    {/* Icon xe ô tô từ Material Symbols */}
                    <div className="brand-icon">
                        <span className="material-symbols-outlined">directions_car</span>
                    </div>

                    {/* Nút bấm này CHỈ kích hoạt hiệu ứng ẩn hiện hover khi đang THU NHỎ */}
                    {isCollapsed && (
                        <button
                            type="button"
                            className="sidebar-gemini-toggle-collapsed"
                            onClick={(e) => {
                                e.stopPropagation(); // Ngăn sự kiện click lan ra brand-logo-zone
                                setIsCollapsed(false); // Mở rộng sidebar
                            }}
                            title="Mở rộng"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    )}
                </div>

                {/* Khi sidebar đang mở rộng: hiển thị tên thương hiệu và nút thu nhỏ */}
                {!isCollapsed && (
                    <>
                        {/* Nhóm văn bản tên hệ thống và phụ đề */}
                        <div className="brand-text-group">
                            <div className="brand-title">Quản lý Bãi xe</div>
                            <div className="brand-subtitle">Hệ thống quản trị</div>
                        </div>

                        {/* Khi đang MỞ RỘNG, nút bấm này LUÔN LUÔN hiển thị cố định ở bên phải cùng hàng */}
                        <button
                            type="button"
                            className="sidebar-gemini-toggle-expanded"
                            onClick={(e) => {
                                e.stopPropagation(); // Ngăn sự kiện lan ra ngoài
                                setIsCollapsed(true); // Thu nhỏ sidebar
                            }}
                            title="Thu nhỏ"
                        >
                            <span className="material-symbols-outlined">menu_open</span>
                        </button>
                    </>
                )}
            </div>

            {/* Danh sách menu điều hướng */}
            <nav className="menu">
                {/* 1. Phân quyền (Chỉ Admin) */}
                {computedRole === 'ADMIN' && (
                    <button
                        type="button"
                        // Thêm class 'active' nếu tab 'user-management' đang được chọn
                        className={`menu-item ${activeTab === 'user-management' ? 'active' : ''}`}
                        onClick={() => onTabChange('user-management')} // Gọi callback đổi tab
                    >
                        <span className="material-symbols-outlined">manage_accounts</span>
                        {/* Chỉ hiển thị text khi sidebar không thu nhỏ */}
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

                {/* 5. Nhật ký vận hành (Manager & Admin) */}
                {(computedRole === 'MANAGER' || computedRole === 'ADMIN') && (
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

            {/* Footer sidebar: thông tin tài khoản và nút đăng xuất */}
            <div className="sidebar-footer">
                {/* Card thông tin tài khoản đang đăng nhập */}
                <div className="sidebar-account-card">
                    {/* Avatar dạng vòng tròn hiển thị chữ cái đầu của email */}
                    <div className="account-avatar-circle">
                        {userInitials}
                    </div>
                    {/* Chỉ hiện chi tiết email và role khi sidebar đang mở rộng */}
                    {!isCollapsed && (
                        <div className="account-info-details">
                            {/* Email người dùng — title để hover xem đầy đủ khi bị cắt ngắn */}
                            <div className="account-info-email" title={userEmail}>{userEmail}</div>
                            {/* Tên role tiếng Việt */}
                            <div className="account-info-role">{getRoleLabel(role)}</div>
                        </div>
                    )}
                </div>

                {/* Nút Đăng xuất */}
                <button type="button" className="logout" onClick={handleLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    {/* Chỉ hiện text "Đăng xuất" khi sidebar đang mở rộng */}
                    {!isCollapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </aside>
    );
}