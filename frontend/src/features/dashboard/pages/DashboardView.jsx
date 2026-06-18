import { useState } from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import { useAuth } from '../../../context/AuthContext';

// Import các phân hệ chức năng con của bạn
import CardPage from './CardPage';
import MonthCardPage from './MonthCardPage';
import LostCardLogPage from './LostCardLogPage';
import MonthCardLogPage from './MonthCardLogPage';
import LoginLogPage from './LoginLogPage';
import UserManagementPage from './UserManagementPage';
import RevenueTrafficPage from './RevenueTrafficPage'; // Đã tích hợp trang mới của bạn bạn vào hệ thống

export default function DashboardView() {
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : 'STAFF';

    const [currentView, setCurrentView] = useState('dashboard');
    const [activeCardTab, setActiveCardTab] = useState('Thẻ lượt');
    const [activeLogTab, setActiveLogTab] = useState('Quẹt thẻ');

    const [selectedPeriod, setSelectedPeriod] = useState('30 ngày qua');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalLut: 158,
        emptySlots: 102,
        fixedSlots: 43,
        incidents: 1,
        todayCount: '200 lượt',
        monthCapacity: '50 vị trí'
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setStats({
                totalLut: Math.floor(Math.random() * 50) + 130,
                emptySlots: Math.floor(Math.random() * 30) + 90,
                fixedSlots: Math.floor(Math.random() * 10) + 40,
                incidents: Math.random() > 0.7 ? 2 : 1,
                todayCount: `${Math.floor(Math.random() * 50) + 180} lượt`,
                monthCapacity: `${Math.floor(Math.random() * 10) + 45} vị trí`
            });
        }, 800);
    };

    const renderTabButton = (label, isActive, onClickAction) => {
        const activeColor = '#004bca';
        return (
            <button
                type="button"
                onClick={onClickAction}
                style={{
                    padding: '10px 24px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${activeColor}` : '3px solid transparent',
                    color: isActive ? activeColor : '#666',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
            >
                {label}
            </button>
        );
    };

    return (
        <DashboardShell currentTab={currentView} onTabSelect={(tab) => setCurrentView(tab)}>

            {/* 1. VIEW QUẢN LÝ THÈ */}
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

            {/* 2. VIEW NHẬT KÝ VẬN HÀNH */}
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

            {/* 3. VIEW PHÂN QUYỀN NGƯỜI DÙNG */}
            {currentView === 'user-management' && (
                <div style={{ marginTop: '10px' }}>
                    <UserManagementPage />
                </div>
            )}

            {/* 4. VIEW CHI TIẾT DOANH THU & LƯU LƯỢNG MỚI TÍCH HỢP */}
            {currentView === 'revenue-traffic' && (
                <div style={{ marginTop: '10px' }}>
                    <RevenueTrafficPage />
                </div>
            )}

            {/* 5. MÀN HÌNH TỔNG QUAN GIÁM SÁT THỜI GIAN THỰC (DESKTOP VIEW) */}
            {currentView === 'dashboard' && (
                <div className="dashboard-desktop">
                    <header className="dashboard-header">
                        <div>
                            <h2>Bảng điều khiển bãi xe - Desktop</h2>
                            <p>Giám sát vận hành thời gian thực và báo cáo doanh thu</p>
                        </div>
                        <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="dashboard-refresh-btn">
                            <span className={`material-symbols-outlined ${isRefreshing ? 'rtp-spin' : ''}`}>refresh</span>
                            <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
                        </button>
                    </header>

                    <section className="quick-actions-section">
                        <h3>Truy cập nhanh nghiệp vụ</h3>
                        <div className="quick-actions-grid">
                            <button type="button" onClick={() => setCurrentView('card-management')} className="action-btn">
                                <span className="material-symbols-outlined">credit_card</span>
                                <span className="action-label">Quản lý Thẻ</span>
                            </button>
                            <button type="button" onClick={() => { setCurrentView('card-management'); setActiveCardTab('Thẻ tháng'); }} className="action-btn">
                                <span className="material-symbols-outlined">calendar_month</span>
                                <span className="action-label">Vé tháng</span>
                            </button>

                            {/* Đã đồng bộ nút Doanh thu & Thống kê trỏ vào view mới nhúng phẳng */}
                            <button type="button" onClick={() => setCurrentView('revenue-traffic')} className="action-btn">
                                <span className="material-symbols-outlined">bar_chart</span>
                                <span className="action-label">Doanh thu</span>
                            </button>
                            <button type="button" onClick={() => setCurrentView('revenue-traffic')} className="action-btn">
                                <span className="material-symbols-outlined">pie_chart</span>
                                <span className="action-label">Thống kê</span>
                            </button>

                            <button type="button" onClick={() => setCurrentView('log-management')} className="action-btn">
                                <span className="material-symbols-outlined">find_in_page</span>
                                <span className="action-label">NK Mất thẻ</span>
                            </button>
                            <button type="button" onClick={() => { setCurrentView('log-management'); setActiveLogTab('Vé tháng'); }} className="action-btn">
                                <span className="material-symbols-outlined">receipt_long</span>
                                <span className="action-label">NK Vé tháng</span>
                            </button>
                            <button type="button" onClick={() => { setCurrentView('log-management'); setActiveLogTab('Đăng nhập'); }} className="action-btn">
                                <span className="material-symbols-outlined">login</span>
                                <span className="action-label">NK Đăng nhập</span>
                            </button>
                            <button type="button" onClick={() => setCurrentView('user-management')} className="action-btn">
                                <span className="material-symbols-outlined">manage_accounts</span>
                                <span className="action-label">Phân quyền</span>
                            </button>
                        </div>
                    </section>

                    <div className="briefs-row">
                        <div className="facility-brief-col">
                            <div className="facility-grid">
                                <div className="brief-card"><span>Lượt gửi</span><p>{stats.totalLut}</p></div>
                                <div className="brief-card"><span>Chỗ trống</span><p>{stats.emptySlots}</p></div>
                                <div className="brief-card"><span>Cố định</span><p>{stats.fixedSlots}</p></div>
                                <div className="brief-card error-card"><span>Sự cố</span><p>{stats.incidents}</p></div>
                            </div>
                        </div>
                        <div className="financial-brief-col">
                            <div className="financial-grid">
                                <div className="brief-card financial-green"><span>Hôm nay</span><p>{stats.todayCount}</p></div>
                                <div className="brief-card financial-blue"><span>Tháng này</span><p>{stats.monthCapacity}</p></div>
                            </div>
                        </div>
                    </div>

                    <section className="revenue-trend-section">
                        <div className="trend-header">
                            <div className="trend-header-left">
                                <h3>Xu hướng doanh thu</h3>
                                <p>Phân tích dòng tiền theo thời gian thực</p>
                            </div>
                            <div className="trend-header-right">
                                <div className="trend-legend-item"><div className="trend-legend-dot orange"></div><span>Doanh thu</span></div>
                                <div className="trend-legend-badge"><div className="trend-legend-dot circle-orange"></div><span>Đỉnh điểm</span></div>
                                <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="trend-period-select">
                                    <option value="30 ngày qua">30 ngày qua</option>
                                    <option value="7 ngày qua">7 ngày qua</option>
                                </select>
                            </div>
                        </div>

                        <div className="bar-chart-container">
                            <div className="chart-grid-lines">
                                <div className="chart-grid-line"><span>100%</span></div>
                                <div className="chart-grid-line"><span>75%</span></div>
                                <div className="chart-grid-line"><span>50%</span></div>
                                <div className="chart-grid-line"><span>25%</span></div>
                                <div className="chart-grid-line baseline"></div>
                            </div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '120px' }}></div><span className="chart-bar-label">T2</span></div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '170px' }}></div><span className="chart-bar-label">T3</span></div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '95px' }}></div><span className="chart-bar-label">T4</span></div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '140px' }}></div><span className="chart-bar-label">T5</span></div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '210px' }}></div><span className="chart-bar-label">T6</span></div>
                            <div className="chart-bar-group"><div className="chart-bar highlight" style={{ height: '230px' }}><div className="chart-bar-indicator"></div></div><span className="chart-bar-label active">T7</span></div>
                            <div className="chart-bar-group"><div className="chart-bar" style={{ height: '150px' }}></div><span className="chart-bar-label active">CN</span></div>
                        </div>
                    </section>

                    <div className="bottom-grid">
                        <div className="bottom-right-col" style={{ width: '100%' }}>
                            <section className="bottom-card incidents-card">
                                <div>
                                    <div className="bottom-card-header"><h3>Sự cố gần đây</h3></div>
                                    <div className="incidents-list">
                                        <div className="incident-item">
                                            <div className="incident-info"><p>29A-888.88</p><span>Mất vé</span></div>
                                            <span className="incident-status-badge processing">ĐANG XỬ LÝ</span>
                                        </div>
                                        <div className="incident-item">
                                            <div className="incident-info"><p>TH-19283</p><span>Thiết bị lỗi</span></div>
                                            <span className="incident-status-badge completed">HOÀN THÀNH</span>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setCurrentView('log-management')} className="view-all-logs-btn" style={{ marginTop: '15px' }}>Xem tất cả nhật ký</button>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}