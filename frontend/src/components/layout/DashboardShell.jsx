import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children, currentTab, onTabSelect }) {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    // Quản lý tab mặc định dựa trên quyền hạn người dùng
    const [activeTab, setActiveTab] = useState(role === 'STAFF' ? 'system' : 'dashboard');

    // ĐỒNG BỘ CHUẨN: Sửa lỗi dùng sai tên biến currentView thành currentTab ở đây
    useEffect(() => {
        if (currentTab) {
            setActiveTab(currentTab);
        }
    }, [currentTab]);

    const handleTabChange = (tab) => {
        if (role === 'STAFF' && tab !== 'system') return;
        if (role === 'MANAGER' && tab === 'user-management') return;

        setActiveTab(tab);
        if (onTabSelect) onTabSelect(tab);
    };

    // Tự động đổi chữ trên Topbar đồng bộ theo đúng Tab đang chọn ở Sidebar
    const getTopbarTitle = () => {
        switch (activeTab) {
            case 'system': return 'Parking System';
            case 'user-management': return 'Quản lý Phân quyền';
            case 'card-management': return 'Quản lý Thẻ';
            case 'log-management': return 'Nhật ký vận hành';
            default: return 'Bảng điều khiển';
        }
    };

    return (
        <div className="layout">
            <Sidebar activeTab={currentTab || activeTab} onTabChange={handleTabChange} />

            <div className="main">
                <Topbar title={getTopbarTitle()} showExtras={activeTab === 'system'} />

                <main className="content">
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}