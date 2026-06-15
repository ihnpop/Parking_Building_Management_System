import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../../../components/layout/DashboardShell';
import { useAuth } from '../../../context/AuthContext';

export default function DashboardView() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const role = userRole ? userRole.toUpperCase() : null;

    const [selectedPeriod, setSelectedPeriod] = useState('30 ngày qua');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Dynamic stats that can "refresh"
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
            // Simulate slight variation on refresh
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

    return (
        <DashboardShell>
            <div className="dashboard-desktop">
                {/* Header */}
                <header className="dashboard-header">
                    <div>
                        <h2>Bảng điều khiển bãi xe - Desktop</h2>
                        <p>Giám sát vận hành thời gian thực và báo cáo doanh thu</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="dashboard-refresh-btn"
                    >
                        <span className={`material-symbols-outlined ${isRefreshing ? 'rtp-spin' : ''}`}>
                            refresh
                        </span>
                        <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
                    </button>
                </header>

                {/* Quick Actions (Truy cập nhanh) */}
                <section className="quick-actions-section">
                    <h3>Truy cập nhanh nghiệp vụ</h3>
                    <div className="quick-actions-grid">
                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/card')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">credit_card</span>
                            <span className="action-label">Quản lý Thẻ</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/month-card')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">calendar_month</span>
                            <span className="action-label">Vé tháng</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/revenue-traffic')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">bar_chart</span>
                            <span className="action-label">Doanh thu</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/OccupancyChart')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">pie_chart</span>
                            <span className="action-label">Thống kê</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/lost-card-log')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">find_in_page</span>
                            <span className="action-label">NK Mất thẻ</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/month-card-log')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">receipt_long</span>
                            <span className="action-label">NK Vé tháng</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/login-log')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">login</span>
                            <span className="action-label">NK Đăng nhập</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login/dashboard/settings')}
                            className="action-btn"
                        >
                            <span className="material-symbols-outlined">settings</span>
                            <span className="action-label">Cài đặt</span>
                        </button>
                    </div>
                </section>

                {/* Central Layout Structure */}
                <div className="briefs-row">
                    {/* Facility Brief */}
                    <div className="facility-brief-col">
                        <div className="facility-grid">
                            <div className="brief-card">
                                <span>Lượt gửi</span>
                                <p>{stats.totalLut}</p>
                            </div>
                            <div className="brief-card">
                                <span>Chỗ trống</span>
                                <p>{stats.emptySlots}</p>
                            </div>
                            <div className="brief-card">
                                <span>Cố định</span>
                                <p>{stats.fixedSlots}</p>
                            </div>
                            <div className="brief-card error-card">
                                <span>Sự cố</span>
                                <p>{stats.incidents}</p>
                            </div>
                        </div>
                    </div>

                    {/* Financial Brief */}
                    <div className="financial-brief-col">
                        <div className="financial-grid">
                            <div className="brief-card financial-green">
                                <span>Hôm nay</span>
                                <p>{stats.todayCount}</p>
                            </div>
                            <div className="brief-card financial-blue">
                                <span>Tháng này</span>
                                <p>{stats.monthCapacity}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prominent Revenue Trend Section */}
                <section className="revenue-trend-section">
                    <div className="trend-header">
                        <div className="trend-header-left">
                            <h3>Xu hướng doanh thu</h3>
                            <p>Phân tích dòng tiền theo thời gian thực</p>
                        </div>
                        <div className="trend-header-right">
                            <div className="trend-legend-item">
                                <div className="trend-legend-dot orange"></div>
                                <span>Doanh thu</span>
                            </div>
                            <div className="trend-legend-badge">
                                <div className="trend-legend-dot circle-orange"></div>
                                <span>Đỉnh điểm</span>
                            </div>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="trend-period-select"
                            >
                                <option value="30 ngày qua">30 ngày qua</option>
                                <option value="7 ngày qua">7 ngày qua</option>
                            </select>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bar-chart-container">
                        {/* Grid Lines */}
                        <div className="chart-grid-lines">
                            <div className="chart-grid-line"><span>100%</span></div>
                            <div className="chart-grid-line"><span>75%</span></div>
                            <div className="chart-grid-line"><span>50%</span></div>
                            <div className="chart-grid-line"><span>25%</span></div>
                            <div className="chart-grid-line baseline"></div>
                        </div>

                        {/* Bars with labels */}
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '120px' }}></div>
                            <span className="chart-bar-label">T2</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '170px' }}></div>
                            <span className="chart-bar-label">T3</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '95px' }}></div>
                            <span className="chart-bar-label">T4</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '140px' }}></div>
                            <span className="chart-bar-label">T5</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '210px' }}></div>
                            <span className="chart-bar-label">T6</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar highlight" style={{ height: '250px' }}>
                                <div className="chart-bar-indicator"></div>
                            </div>
                            <span className="chart-bar-label active">T7</span>
                        </div>
                        <div className="chart-bar-group">
                            <div className="chart-bar" style={{ height: '180px' }}></div>
                            <span className="chart-bar-label active">CN</span>
                        </div>
                    </div>
                </section>

                {/* Bottom Row: Detailed Analysis & Incidents */}
                <div className="bottom-grid">
                    {/* Left: Occupancy & Vehicle Distribution */}
                    <div className="bottom-left-col">
                        <section className="bottom-card">
                            <div className="bottom-card-header">
                                <h3>Tỷ lệ lấp đầy theo tầng</h3>
                                <div className="occupancy-legend">
                                    <div className="occupancy-legend-item">
                                        <div className="occupancy-legend-dot orange"></div>
                                        <span>B1</span>
                                    </div>
                                    <div className="occupancy-legend-item">
                                        <div className="occupancy-legend-dot blue"></div>
                                        <span>B2</span>
                                    </div>
                                </div>
                            </div>

                            <div className="progress-group">
                                <div className="progress-header">
                                    <span>Tầng hầm B1</span>
                                    <span>122/ 200 (61%)</span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fill orange" style={{ width: '61%' }}></div>
                                </div>
                            </div>

                            <div className="progress-group">
                                <div className="progress-header">
                                    <span>Tầng hầm B2</span>
                                    <span>36/60 (60%)</span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fill blue" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                        </section>

                        {/* Vehicle Distribution */}
                        <section className="bottom-card vehicle-class-card">
                            <div className="vehicle-class-content">
                                <h3>Phân loại xe</h3>
                                <div className="vehicle-class-bar">
                                    <div className="vehicle-class-segment orange" style={{ width: '77.2%' }}></div>
                                    <div className="vehicle-class-segment blue" style={{ width: '21.6%' }}></div>
                                    <div className="vehicle-class-segment green" style={{ width: '1.2%' }}></div>
                                </div>
                                <div className="vehicle-class-labels">
                                    <div className="vehicle-class-label-item">
                                        <span className="vehicle-dot orange"></span>
                                        <span>2 bánh (77%)</span>
                                    </div>
                                    <div className="vehicle-class-label-item">
                                        <span className="vehicle-dot blue"></span>
                                        <span>4 bánh (21%)</span>
                                    </div>
                                    <div className="vehicle-class-label-item">
                                        <span className="vehicle-dot green"></span>
                                        <span>Bán tải (2%)</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Incidents */}
                    <div className="bottom-right-col">
                        <section className="bottom-card incidents-card">
                            <div>
                                <div className="bottom-card-header">
                                    <h3>Sự cố gần đây</h3>
                                </div>
                                <div className="incidents-list">
                                    <div className="incident-item">
                                        <div className="incident-info">
                                            <p>29A-888.88</p>
                                            <span>Mất vé</span>
                                        </div>
                                        <span className="incident-status-badge processing">ĐANG XỬ LÝ</span>
                                    </div>
                                    <div className="incident-item">
                                        <div className="incident-info">
                                            <p>TH-19283</p>
                                            <span>Thiết bị lỗi</span>
                                        </div>
                                        <span className="incident-status-badge completed">HOÀN THÀNH</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/login/dashboard/lost-card-log')}
                                className="view-all-logs-btn"
                            >
                                Xem tất cả nhật ký
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}