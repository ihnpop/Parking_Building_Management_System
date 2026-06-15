import { useState, useEffect } from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import DashboardSection from '../components/DashboardSection';
import { useAuth } from '../../../context/AuthContext';

// Import các trang chức năng con
import CardPage from './CardPage';
import MonthCardPage from './MonthCardPage';
import LostCardLogPage from './LostCardLogPage';
import MonthCardLogPage from './MonthCardLogPage';
import LoginLogPage from './LoginLogPage'; // Đã khôi phục đầy đủ
import UserManagementPage from './UserManagementPage';

const dashboardSections = [
    {
        title: 'THỐNG KÊ',
        columns: 3,
        cards: [
            { title: 'Thống kê tổng quát', description: 'Xem tổng quát doanh thu theo khoảng thời gian, tồn đầu kỳ, cuối kỳ.', icon: 'pie_chart', path: '/login/dashboard/OccupancyChart' },
        ],
    },
    {
        title: 'CÀI ĐẶT HỆ THỐNG',
        columns: 3,
        cards: [
            { title: 'Hệ thống', description: 'Thiết lập thông tin hệ thống, thiết bị đọc thẻ và cấu hình chung.', icon: 'settings', path: '/login/dashboard/settings' },
        ],
    },
];

export default function DashboardView() {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : 'STAFF';

    // State theo dõi Tab lớn ở Sidebar ('dashboard', 'card-management', 'log-management', 'user-management')
    const [currentView, setCurrentView] = useState('dashboard');

    // State phân hệ Quản lý Thẻ
    const [activeCardTab, setActiveCardTab] = useState('Thẻ lượt');

    // State phân hệ Nhật ký vận hành (Mặc định chọn 'Quẹt thẻ')
    const [activeLogTab, setActiveLogTab] = useState('Quẹt thẻ');

    const filteredSections = dashboardSections.filter(section => true);

    // Hàm tiện ích render nút bấm chuyển Tab lớn gạch chân
    const renderTabButton = (label, isActive, onClickAction) => (
        <button
            type="button"
            onClick={onClickAction}
            style={{
                padding: '10px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #e65c00' : '3px solid transparent',
                color: isActive ? '#e65c00' : '#666',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            {label}
        </button>
    );

    return (
        <DashboardShell currentTab={currentView} onTabSelect={(tab) => setCurrentView(tab)}>

            {/* 1. HIỂN THỊ PHÂN HỆ QUẢN LÝ THẺ */}
            {currentView === 'card-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f0f0f0', marginTop: '10px' }}>
                        {renderTabButton('Thẻ lượt', activeCardTab === 'Thẻ lượt', () => setActiveCardTab('Thẻ lượt'))}
                        {renderTabButton('Thẻ tháng', activeCardTab === 'Thẻ tháng', () => setActiveCardTab('Thẻ tháng'))}
                    </div>
                    <div style={{ marginTop: '5px' }}>
                        {activeCardTab === 'Thẻ lượt' ? <CardPage defaultType="Thẻ lượt" /> : <MonthCardPage />}
                    </div>
                </div>
            )}

            {/* 2. HIỂN THỊ PHÂN HỆ NHẬT KÝ VẬN HÀNH (Đầy đủ 3 tab) */}
            {currentView === 'log-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f0f0f0', marginTop: '10px' }}>
                        {renderTabButton('Nhật ký quẹt thẻ', activeLogTab === 'Quẹt thẻ', () => setActiveLogTab('Quẹt thẻ'))}
                        {renderTabButton('Nhật ký vé tháng', activeLogTab === 'Vé tháng', () => setActiveLogTab('Vé tháng'))}
                        {renderTabButton('Nhật ký đăng nhập', activeLogTab === 'Đăng nhập', () => setActiveLogTab('Đăng nhập'))}
                    </div>
                    <div style={{ marginTop: '5px' }}>
                        {activeLogTab === 'Quẹt thẻ' && <LostCardLogPage />}
                        {activeLogTab === 'Vé tháng' && <MonthCardLogPage />}
                        {activeLogTab === 'Đăng nhập' && <LoginLogPage />}
                    </div>
                </div>
            )}

            {/* 3. HIỂN THỊ PHÂN HỆ PHÂN QUYỀN NGƯỜI DÙNG */}
            {currentView === 'user-management' && (
                <div style={{ marginTop: '10px' }}>
                    <UserManagementPage />
                </div>
            )}

            {/* 4. MÀN HÌNH TỔNG QUAN BAN ĐẦU CỦA DASHBOARD */}
            {currentView === 'dashboard' && (
                filteredSections.map((section) => (
                    <DashboardSection key={section.title} {...section} />
                ))
            )}
        </DashboardShell>
    );
}