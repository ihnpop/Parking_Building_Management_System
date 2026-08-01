// Import useState để quản lý trạng thái collapse sidebar và tab active
// Import useEffect để đồng bộ tab khi prop thay đổi
import { useState, useEffect } from 'react';
// Import component Sidebar (thanh menu bên trái)
import Sidebar from './Sidebar';
// Import component Topbar (thanh tiêu đề phía trên)
import Topbar from './Topbar';
// Import component vận hành cổng xe — luôn render khi tab là 'system'
import SystemOperations from '../../features/dashboard/components/SystemOperations';
// Import useAuth hook để đọc thông tin user và role hiện tại
import { useAuth } from '../../context/AuthContext';
// Import CSS riêng của DashboardShell
import "./DashboardShell.css";

// DashboardShell: layout bọc ngoài toàn bộ giao diện Dashboard
// Props: children (nội dung trang con), currentTab (tab đang hiển thị từ DashboardView), onTabSelect (callback khi chuyển tab)
export default function DashboardShell({ children, currentTab, onTabSelect }) {
    // Lấy thông tin user và role từ AuthContext
    const { user, userRole } = useAuth();
    // Lấy email user, dùng email fallback nếu chưa đăng nhập
    const userEmail = user?.email || 'admin@parkflow.com';
    // Chuẩn hóa email: lowercase và cắt khoảng trắng
    const email = userEmail.toLowerCase().trim();

    // Xác định role: ưu tiên từ state, fallback về null
    let role = userRole ? userRole.toUpperCase() : null;
    // Override role theo email cứng dành cho tài khoản test/demo
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    // Danh sách tab được phép truy cập theo từng vai trò
    const MANAGER_ALLOWED_VIEWS = ['manager-dashboard', 'card-management', 'adjust-prices', 'log-management'];
    const ADMIN_ALLOWED_VIEWS = ['user-management', 'dashboard', 'revenue-traffic', 'log-management'];

    // Hàm xác định tab mặc định khi lần đầu load (phụ thuộc vào role)
    const getDefaultTab = (currentRole) => {
        if (currentRole === 'ADMIN') return 'user-management'; // Tab đầu tiên của Admin
        if (currentRole === 'MANAGER') return 'manager-dashboard'; // Tab đầu tiên của Manager
        return 'system'; // STAFF chỉ có tab vận hành cổng xe
    };

    // State lưu tab đang active, khởi tạo theo role hiện tại
    const [activeTab, setActiveTab] = useState(() => getDefaultTab(role));
    // State quản lý trạng thái thu/mở của sidebar (true = đang thu nhỏ)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Đồng bộ tab đang active với currentTab từ DashboardView và giới hạn theo vai trò người dùng
    useEffect(() => {
        if (role) {
            if (role === 'STAFF') {
                // STAFF chỉ có duy nhất tab 'system' — luôn set về 'system'
                setActiveTab('system');
            } else if (role === 'MANAGER' && !MANAGER_ALLOWED_VIEWS.includes(currentTab)) {
                // Manager không có quyền xem tab này, đặt lại về 'manager-dashboard' (tab đầu tiên của Manager)
                setActiveTab('manager-dashboard');
            } else if (role === 'ADMIN' && !ADMIN_ALLOWED_VIEWS.includes(currentTab)) {
                // Admin không có quyền truy cập tab riêng của Manager, đặt lại về 'user-management' (tab đầu tiên của Admin)
                setActiveTab('user-management');
            } else if (currentTab) {
                // Tab hợp lệ: đồng bộ activeTab với currentTab nhận từ props
                setActiveTab(currentTab);
            }
        }
    }, [currentTab, role]); // Chạy lại khi currentTab hoặc role thay đổi

    // Xử lý chuyển tab khi người dùng click menu ở Sidebar
    const handleTabChange = (tab) => {
        // STAFF chỉ được ở tab 'system' — block mọi tab khác
        if (role === 'STAFF' && tab !== 'system') return;
        // MANAGER chỉ được vào tab trong danh sách MANAGER_ALLOWED_VIEWS
        if (role === 'MANAGER' && !MANAGER_ALLOWED_VIEWS.includes(tab)) return;
        // ADMIN chỉ được vào tab trong danh sách ADMIN_ALLOWED_VIEWS
        if (role === 'ADMIN' && !ADMIN_ALLOWED_VIEWS.includes(tab)) return;

        // Cập nhật tab local
        setActiveTab(tab);
        // Gọi callback lên DashboardView để đồng bộ view
        if (onTabSelect) onTabSelect(tab);
    };

    // Đặt tiêu đề hiển thị trên Topbar tương ứng với từng tab
    const getTopbarTitle = () => {
        switch (activeTab) {
            case 'system': return 'Parking System';          // Tab vận hành cổng xe (Staff)
            case 'user-management': return 'Quản lý Phân quyền'; // Tab phân quyền (Admin)
            case 'card-management': return 'Quản lý Thẻ';        // Tab thẻ lượt/tháng (Manager)
            case 'adjust-prices': return 'Điều chỉnh giá';        // Tab biểu giá (Manager)
            case 'log-management': return 'Nhật ký vận hành';     // Tab nhật ký (Manager & Admin)
            case 'dashboard': return 'Bảng điều khiển';           // Tab thống kê tổng quan (Admin)
            case 'manager-dashboard': return 'Tổng quan Bãi xe';  // Tab dashboard của Manager
            default: return 'Bảng điều khiển';
        }
    };

    // activeViewTab: dùng currentTab từ props nếu có (ưu tiên), fallback về activeTab local
    const activeViewTab = currentTab || activeTab;

    return (
        // Wrapper layout chính: thêm class 'sidebar-is-collapsed' khi sidebar đang thu nhỏ (để CSS điều chỉnh main area)
        <div className={`layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
            {/* Chỉ render Sidebar cho ADMIN và MANAGER — STAFF không có sidebar */}
            {role !== 'STAFF' && (
                <Sidebar
                    activeTab={activeViewTab}         // Tab đang được highlight trong sidebar
                    onTabChange={handleTabChange}     // Callback khi user click tab trong sidebar
                    isCollapsed={sidebarCollapsed}    // Trạng thái thu/mở
                    setIsCollapsed={setSidebarCollapsed} // Hàm toggle thu/mở
                />
            )}

            {/* Khu vực nội dung chính bên phải sidebar */}
            <div className="main">
                {/* Topbar chỉ render khi không ở tab 'settings' */}
                {activeViewTab !== 'settings' && (
                    <Topbar
                        title={getTopbarTitle()}   // Tiêu đề trang tương ứng tab hiện tại
                        showExtras={activeViewTab === 'system' || activeViewTab === 'user-management'} // Hiển thị thêm nút phụ ở 2 tab này
                        currentTab={activeViewTab} // Truyền tab hiện tại xuống Topbar để render có điều kiện
                    />
                )}

                {/* Vùng nội dung trang — render SystemOperations nếu tab là 'system', còn lại render children */}
                <main className="content">
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}