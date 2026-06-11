import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';

export default function DashboardShell({ children }) {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(() => {
        if (location.pathname.includes('/user-management')) {
            return 'user-management';
        }
        return 'dashboard';
    });

    useEffect(() => {
        if (location.pathname.includes('/user-management')) {
            setActiveTab('user-management');
        } else if (activeTab !== 'system') {
            setActiveTab('dashboard');
        }
    }, [location.pathname]);

    return (
        <div className="layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="main">
                <Topbar
                    title={activeTab === 'system' ? 'Parking System' : activeTab === 'user-management' ? 'Quản lý Phân quyền' : 'Bảng điều khiển'}
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