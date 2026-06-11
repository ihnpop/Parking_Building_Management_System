import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children }) {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    const defaultTab = role === 'STAFF' ? 'system' : 'dashboard';
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Sync active tab when role loads
    useEffect(() => {
        if (role === 'STAFF') {
            setActiveTab('system');
        }
    }, [role]);

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
                    title={activeTab === 'system' ? 'Parking System' : 'Bảng điều khiển'}
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