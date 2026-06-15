import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children, currentTab, onTabSelect }) {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    // Thiết lập Tab mặc định khi vừa đăng nhập vào dựa trên quyền:
    // STAFF mặc định vào thẳng 'system', các quyền khác vào 'dashboard'
    const [activeTab, setActiveTab] = useState(role === 'STAFF' ? 'system' : 'dashboard');

    // Đồng bộ và kiểm soát tab cưỡng ép theo Role hệ thống
    useEffect(() => {
        if (role === 'STAFF') {
            setActiveTab('system');
        } else if (role === 'MANAGER' && currentTab === 'user-management') {
            setActiveTab('dashboard'); // MANAGER không được xem phân quyền, đá về trang chủ
        } else if (currentTab) {
            setActiveTab(currentTab);
        }
    }, [currentTab, role]);

    const handleTabChange = (tab) => {
        // Lớp bảo mật chặn click trái phép:
        if (role === 'STAFF' && tab !== 'system') return; // STAFF chỉ được ở tab system
        if (role === 'MANAGER' && tab === 'user-management') return; // MANAGER không được động vào phân quyền

        setActiveTab(tab);
        if (onTabSelect) onTabSelect(tab);
    };

    // Hàm tự động cập nhật tiêu đề Header đồng bộ
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
                    {/* Nếu là tab nghiệp vụ thì render khối camera/vận hành, ngược lại render trang con */}
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}