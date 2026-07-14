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

    const getDefaultTab = (currentRole) => {
        if (currentRole === 'ADMIN') return 'user-management';
        if (currentRole === 'MANAGER') return 'card-management';
        return 'system';
    };

    const [activeTab, setActiveTab] = useState(() => getDefaultTab(role));
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (role) {
            if (role === 'STAFF') {
                setActiveTab('system');
            } else if (role === 'MANAGER' && (currentTab === 'user-management' || currentTab === 'dashboard')) {
                setActiveTab('card-management');
            } else if (role === 'ADMIN' && (currentTab === 'card-management' || currentTab === 'log-management')) {
                setActiveTab('user-management');
            } else if (currentTab) {
                setActiveTab(currentTab);
            }
        }
    }, [currentTab, role]);

    const handleTabChange = (tab) => {
        if (role === 'STAFF' && tab !== 'system') return;
        if (role === 'MANAGER' && (tab === 'user-management' || tab === 'dashboard' || tab === 'system')) return;
        if (role === 'ADMIN' && (tab === 'card-management' || tab === 'log-management' || tab === 'system')) return;

        setActiveTab(tab);
        if (onTabSelect) onTabSelect(tab);
    };

    const getTopbarTitle = () => {
        switch (activeTab) {
            case 'system': return 'Parking System';
            case 'user-management': return 'Quản lý Phân quyền';
            case 'card-management': return 'Quản lý Thẻ';
            case 'log-management': return 'Nhật ký vận hành';
            case 'system-settings': return 'Cài đặt hệ thống';
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