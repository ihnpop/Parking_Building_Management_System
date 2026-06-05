import { useState } from 'react'
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DashboardView from '../../features/dashboard/pages/DashboardView';

/**
 * DashboardShell là shell chính của ứng dụng sau khi đã đăng nhập.
 * Nó giữ nguyên sidebar và topbar, sau đó chuyển giữa hai nội dung:
 * - Dashboard chính
 * - Nghiệp vụ hệ thống
 */
export default function DashboardShell() {
    const [activeTab, setActiveTab] = useState('dashboard')

    return (
        <div className="layout">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="main">
                <Topbar
                    title={activeTab === 'system' ? 'ParkFlow Admin' : 'Bảng điều khiển'}
                    showExtras={activeTab === 'system'}
                />

                <main className="content">
                    {activeTab === 'system' ? <SystemOperations /> : <DashboardView />}
                </main>
            </div>
        </div>
    )
}