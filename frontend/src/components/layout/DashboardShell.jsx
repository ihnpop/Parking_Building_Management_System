import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children }) {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;
    const location = useLocation();

    const getInitialTab = () => {
        if (role === 'STAFF') {
            return 'system';
        }
        if (location.pathname.includes('/user-management')) {
            return 'user-management';
        }
        return 'dashboard';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    // Sync active tab when location or role changes
    useEffect(() => {
        if (role === 'STAFF') {
            setActiveTab('system');
        } else if (location.pathname.includes('/user-management')) {
            setActiveTab('user-management');
        } else if (location.pathname.includes('/settings')) {
            setActiveTab('settings');
        } else if (activeTab !== 'system') {
            setActiveTab('dashboard');
        }
    }, [location.pathname, role]);

    const handleTabChange = (tab) => {
        if (role === 'STAFF' && tab !== 'system') {
            return; // Staff is restricted to system tab
        }
        if (role === 'MANAGER' && tab === 'user-management') {
            return; // Manager has no user-management access
        }
        setActiveTab(tab);
    };

    return (
        <div className="layout">
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

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