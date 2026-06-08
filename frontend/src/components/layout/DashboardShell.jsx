import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SystemOperations from '../../features/dashboard/components/SystemOperations';

export default function DashboardShell({ children }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

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