import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';
import { useAuth } from '../../context/AuthContext';

export default function DashboardShell({ children, currentTab, onTabSelect }) {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    const [activeTab, setActiveTab] = useState(role === 'STAFF' ? 'system' : 'dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (role === 'STAFF') {
            setActiveTab('system');
        } else if (role === 'MANAGER' && currentTab === 'user-management') {
            setActiveTab('dashboard');
        } else if (currentTab) {
            setActiveTab(currentTab);
        }
    }, [currentTab, role]);

    const handleTabChange = (tab) => {
        if (role === 'STAFF' && tab !== 'system') return;
        if (role === 'MANAGER' && tab === 'user-management') return;

        setActiveTab(tab);
        if (onTabSelect) onTabSelect(tab);
    };

    const getTopbarTitle = () => {
        switch (activeTab) {
            case 'system': return 'Parking System';
            case 'user-management': return 'Quản lý Phân quyền';
            case 'card-management': return 'Quản lý Thẻ';
            case 'log-management': return 'Nhật ký vận hành';

            default: return 'Bảng điều khiển';
        }
    };

    const activeViewTab = currentTab || activeTab;

    return (
        <div className={`layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
            {/* Đã truyền đầy đủ hai thuộc tính điều khiển thu mở vào Sidebar */}
            <Sidebar
                activeTab={activeViewTab}
                onTabChange={handleTabChange}
                isCollapsed={sidebarCollapsed}
                setIsCollapsed={setSidebarCollapsed}
            />

            <div className="main">
                <Topbar
                    title={getTopbarTitle()}
                    showExtras={activeViewTab === 'system' || activeViewTab === 'user-management'}
                    currentTab={activeViewTab}
                />

                <main className="content">
                    {activeTab === 'system' ? <SystemOperations /> : children}
                </main>
            </div>
        </div>
    );
}