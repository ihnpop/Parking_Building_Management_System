import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children, currentTab, onTabSelect }) {
    const { user, userRole } = useAuth();
    const userEmail = user?.email || 'admin@parkflow.com';
    const email = userEmail.toLowerCase().trim();

    let role = userRole ? userRole.toUpperCase() : null;
    if (email === 'admin@gmail.com') role = 'ADMIN';
    else if (email === 'manager@gmail.com') role = 'MANAGER';
    else if (email === 'staff@gmail.com') role = 'STAFF';

    // Danh sách tab được phép truy cập theo từng vai trò
    const MANAGER_ALLOWED_VIEWS = ['manager-dashboard', 'card-management', 'adjust-prices', 'log-management', 'system-settings'];
    const ADMIN_ALLOWED_VIEWS = ['user-management', 'dashboard', 'system-settings', 'revenue-traffic'];

    const getDefaultTab = (currentRole) => {
        if (currentRole === 'ADMIN') return 'user-management'; // Tab đầu tiên của Admin
        if (currentRole === 'MANAGER') return 'manager-dashboard'; // Tab đầu tiên của Manager
        return 'system';
    };

    const [activeTab, setActiveTab] = useState(() => getDefaultTab(role));
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Đồng bộ tab đang active với currentTab từ DashboardView và giới hạn theo vai trò người dùng
    useEffect(() => {
        if (role) {
            if (role === 'STAFF') {
                setActiveTab('system');
            } else if (role === 'MANAGER' && !MANAGER_ALLOWED_VIEWS.includes(currentTab)) {
                // Manager không có quyền xem tab này, đặt lại về 'manager-dashboard' (tab đầu tiên của Manager)
                setActiveTab('manager-dashboard');
            } else if (role === 'ADMIN' && !ADMIN_ALLOWED_VIEWS.includes(currentTab)) {
                // Admin không có quyền truy cập tab riêng của Manager, đặt lại về 'user-management' (tab đầu tiên của Admin)
                setActiveTab('user-management');
            } else if (currentTab) {
                setActiveTab(currentTab);
            }
        }
    }, [currentTab, role]);

    // Xử lý chuyển tab khi người dùng click menu ở Sidebar
    const handleTabChange = (tab) => {
        if (role === 'STAFF' && tab !== 'system') return;
        if (role === 'MANAGER' && !MANAGER_ALLOWED_VIEWS.includes(tab)) return;
        if (role === 'ADMIN' && !ADMIN_ALLOWED_VIEWS.includes(tab)) return;

        setActiveTab(tab);
        if (onTabSelect) onTabSelect(tab);
    };

    // Đặt tiêu đề hiển thị trên Topbar tương ứng với từng tab
    const getTopbarTitle = () => {
        switch (activeTab) {
            case 'system': return 'Parking System';
            case 'user-management': return 'Quản lý Phân quyền';
            case 'card-management': return 'Quản lý Thẻ';
            case 'adjust-prices': return 'Điều chỉnh giá';
            case 'log-management': return 'Nhật ký vận hành';
            case 'system-settings': return 'Cài đặt hệ thống';
            case 'dashboard': return 'Bảng điều khiển';
            case 'manager-dashboard': return 'Tổng quan Bãi xe';
            default: return 'Bảng điều khiển';
        }
    };

    const activeViewTab = currentTab || activeTab;

    return (
        <div className={`layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
            {role !== 'STAFF' && (
                <Sidebar
                    activeTab={activeViewTab}
                    onTabChange={handleTabChange}
                    isCollapsed={sidebarCollapsed}
                    setIsCollapsed={setSidebarCollapsed}
                />
            )}

            <div className="main">
                {activeViewTab !== 'settings' && (
                    <Topbar
                        title={getTopbarTitle()}
                        showExtras={activeViewTab === 'system' || activeViewTab === 'user-management'}
                        currentTab={activeViewTab}
                    />
                )}

                <main className="content">
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}