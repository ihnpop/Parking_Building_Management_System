import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children }) {
    const { userRole } = useAuth();
    const location = useLocation();
    const isStaff = userRole === 'STAFF';

    // STAFF mặc định vào tab nghiệp vụ, các role khác vào bảng điều khiển
    const [activeTab, setActiveTab] = useState(isStaff ? 'system' : 'dashboard');

    // Xác định tiêu đề topbar theo URL + tab
    const getTitle = () => {
        if (activeTab === 'system') return 'Parking System';
        if (location.pathname === '/login/dashboard/user-management') return 'Phân quyền người dùng';
        return 'Bảng điều khiển';
    };

    return (
        <div className="layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="main">
                <Topbar
                    title={getTitle()}
                    showExtras={activeTab === 'system'}
                />

                <main className="content">
                    {/* Nếu chọn tab 'system' thì hiển thị khối vận hành, ngược lại hiển thị nội dung trang tương ứng */}
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}
