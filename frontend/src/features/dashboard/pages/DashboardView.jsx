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
import RevenueTrafficPage from './RevenueTrafficPage';

// ─── Mock hourly traffic data ───────────────────────────────────────────────
const HOURLY_DATA = [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 10, 12, 9, 7, 6, 14, 22, 28, 30, 18, 10, 4, 1];

// ─── Mock floor occupancy ────────────────────────────────────────────────────
const FLOOR_DATA = [
    { name: 'Tầng hầm (B1)', used: 1, total: 3 },
    { name: 'Tầng trệt (G1)', used: 1, total: 4 },
    { name: 'Khu phụ chính', used: 1, total: 1 },
];

// ─── Mock vehicle types ──────────────────────────────────────────────────────
const VEHICLE_TYPES = [
    { label: 'Xe tải nhẹ', count: 1, pct: 33, color: '#f97316' },
    { label: 'SUV', count: 1, pct: 33, color: '#2563EB' },
    { label: 'Sedan', count: 1, pct: 34, color: '#10b981' },
];

// ─── Mock recent vehicles ────────────────────────────────────────────────────
const RECENT_IN = [
    { plate: '61A 660-770', slot: 'L-301', time: '21:47' },
    { plate: '30F-999.99', slot: 'A-202', time: '20:04' },
    { plate: '29A-888.88', slot: 'V-102', time: '18:04' },
];

// ─── Mock incidents ───────────────────────────────────────────────────────────
const INCIDENTS = [
    { id: '29A-888.88', type: 'MẤT VÉ', status: 'ĐANG CHỜ', statusClass: 'db-badge--waiting' },
    { id: 'TH-19283', type: 'THIẾT BỊ LỖI', status: 'HOÀN THÀNH', statusClass: 'db-badge--done' },
];

// ─── Weekly revenue bars ──────────────────────────────────────────────────────
const WEEK_BARS = [
    { label: 'T2', h: 120 },
    { label: 'T3', h: 170 },
    { label: 'T4', h: 95 },
    { label: 'T5', h: 140 },
    { label: 'T6', h: 210 },
    { label: 'T7', h: 230, peak: true },
    { label: 'CN', h: 150 },
];

const MAX_BAR = 230;

export default function DashboardView() {
    const { userRole, user } = useAuth();
    const role = userRole ? userRole.toUpperCase() : 'STAFF';
    const userInitials = (user?.email || 'A').charAt(0).toUpperCase();

    const [currentView, setCurrentView] = useState('dashboard');
    const [activeCardTab, setActiveCardTab] = useState('Thẻ lượt');
    const [activeLogTab, setActiveLogTab] = useState('Quẹt thẻ');
    const [selectedPeriod, setSelectedPeriod] = useState('30 ngày qua');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        activeSessions: 3,
        emptySlots: 5,
        usedSlots: 3,
        incidents: 1,
        revenueToday: '$14.00',
        revenueMonth: '$14.00',
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setStats({
                activeSessions: Math.floor(Math.random() * 5) + 2,
                emptySlots: Math.floor(Math.random() * 4) + 4,
                usedSlots: Math.floor(Math.random() * 4) + 2,
                incidents: Math.random() > 0.7 ? 2 : 1,
                revenueToday: `$${(Math.random() * 20 + 10).toFixed(2)}`,
                revenueMonth: `$${(Math.random() * 20 + 10).toFixed(2)}`,
            });
        }, 800);
    };

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
                borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                color: isActive ? '#2563EB' : '#666',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            {label}
        </button>
    );

    const maxHourly = Math.max(...HOURLY_DATA, 1);

    return (
        <DashboardShell currentTab={currentView} onTabSelect={(tab) => setCurrentView(tab)}>

            {/* 1. VIEW QUẢN LÝ THẺ */}
            {currentView === 'card-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
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
                <div style={{ marginTop: '10px', padding: '24px' }}>
                    <UserManagementPage />
                </div>
            )}

            {/* 4. VIEW CHI TIẾT DOANH THU & LƯU LƯỢNG */}
            {currentView === 'revenue-traffic' && (
                <div style={{ marginTop: '10px', padding: '24px' }}>
                    <RevenueTrafficPage />
                </div>
            )}

            {/* 5. MÀN HÌNH TỔNG QUAN – GIAO DIỆN XANH MỚI */}
            {currentView === 'dashboard' && (
                <div className="db-page">

                    {/* ── Title row ── */}
                    <div className="db-title-row">
                        <div>
                            <h1 className="db-h1">Thống Kê Tổng Quan</h1>
                            <p className="db-sub">Số liệu vận hành trực tiếp, tình trạng lấp đầy và báo cáo hàng ngày</p>
                        </div>
                        <button
                            type="button"
                            className={`db-refresh-btn${isRefreshing ? ' db-refresh-btn--spinning' : ''}`}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            {isRefreshing ? 'Đang cập nhật…' : 'Làm mới'}
                        </button>
                    </div>

                    {/* ── KPI Cards ── */}
                    <div className="db-kpis">
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>PHIÊN ĐANG HOẠT ĐỘNG</span>
                                <span className="db-kpi-icon" style={{ color: '#f97316' }}>
                                    <span className="material-symbols-outlined">directions_car</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.activeSessions} lượt đỗ</div>
                            <div className="db-kpi-note">Xe hiện đang trong bãi</div>
                        </div>

                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>CHỖ TRỐNG KHẢ DỤNG</span>
                                <span className="db-kpi-icon" style={{ color: '#14b8a6' }}>
                                    <span className="material-symbols-outlined">local_parking</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.emptySlots} chỗ</div>
                            <div className="db-kpi-note">Sẵn sàng cấp phát khi xe vào</div>
                        </div>

                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>CHỖ ĐÃ SỬ DỤNG</span>
                                <span className="db-kpi-icon" style={{ color: '#f59e0b' }}>
                                    <span className="material-symbols-outlined">event_seat</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.usedSlots} chỗ</div>
                            <div className="db-kpi-note">Các chỗ đang được sử dụng</div>
                        </div>

                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>SỰ CỐ HÔM NAY</span>
                                <span className="db-kpi-icon" style={{ color: '#ef4444' }}>
                                    <span className="material-symbols-outlined">warning</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.incidents} sự cố</div>
                            <div className="db-kpi-note">Các trường hợp ngoại lệ đã ghi nhận</div>
                        </div>

                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>DOANH THU HÔM NAY</span>
                                <span className="db-kpi-icon" style={{ color: '#059669' }}>
                                    <span className="material-symbols-outlined">payments</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.revenueToday}</div>
                            <div className="db-kpi-note">Tiền mặt &amp; QR ngân hàng đã thu</div>
                        </div>

                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>DOANH THU THÁNG</span>
                                <span className="db-kpi-icon" style={{ color: '#f97316' }}>
                                    <span className="material-symbols-outlined">trending_up</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.revenueMonth}</div>
                            <div className="db-kpi-note">Tổng doanh thu 30 ngày gần nhất</div>
                        </div>
                    </div>

                    {/* ── Charts grid (2 columns) ── */}
                    <div className="db-grid2">

                        {/* Lượt xe theo giờ */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Lượt xe theo giờ</p>
                                <p className="db-card-desc">Phân bố lượt xe vào trung bình theo giờ (08:00 – 22:00)</p>
                            </div>
                            <div className="db-card-body">
                                <div className="db-bar-chart">
                                    {HOURLY_DATA.map((val, idx) => (
                                        <div className="db-bar-wrap" key={idx}>
                                            <div
                                                className="db-bar"
                                                style={{ height: `${Math.max(2, (val / maxHourly) * 100)}px` }}
                                            />
                                            <span className="db-x">
                                                {String(idx).padStart(2, '0')}h
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tỷ lệ lấp đầy theo tầng */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Tỷ lệ lấp đầy theo tầng</p>
                                <p className="db-card-desc">Mức sử dụng công suất theo từng tầng</p>
                            </div>
                            <div className="db-card-body">
                                {FLOOR_DATA.map((floor) => {
                                    const pct = Math.round((floor.used / floor.total) * 100);
                                    return (
                                        <div className="db-floor" key={floor.name}>
                                            <div className="db-floor-top">
                                                <span>▧ {floor.name}</span>
                                                <span>{floor.used} / {floor.total} slots ({pct}%)</span>
                                            </div>
                                            <div className="db-track">
                                                <div className="db-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Xu hướng doanh thu */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <div className="db-card-head-row">
                                    <div>
                                        <p className="db-card-title">Xu hướng doanh thu</p>
                                        <p className="db-card-desc">Tổng thu tài chính trong 30 ngày qua</p>
                                    </div>
                                    <select
                                        className="db-period-select"
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                    >
                                        <option value="30 ngày qua">30 ngày qua</option>
                                        <option value="7 ngày qua">7 ngày qua</option>
                                    </select>
                                </div>
                            </div>
                            <div className="db-card-body">
                                <div className="db-revenue-chart">
                                    <div className="db-rev-y-axis">
                                        <span>100%</span>
                                        <span>75%</span>
                                        <span>50%</span>
                                        <span>25%</span>
                                    </div>
                                    <div className="db-rev-bars">
                                        {WEEK_BARS.map((b) => (
                                            <div className="db-rev-bar-group" key={b.label}>
                                                <div
                                                    className={`db-rev-bar${b.peak ? ' db-rev-bar--peak' : ''}`}
                                                    style={{ height: `${(b.h / MAX_BAR) * 100}%` }}
                                                >
                                                    {b.peak && <div className="db-peak-dot" />}
                                                </div>
                                                <span className="db-rev-label">{b.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phân loại phương tiện */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Phân loại phương tiện</p>
                                <p className="db-card-desc">Tỷ lệ các loại phương tiện đang đỗ trong bãi</p>
                            </div>
                            <div className="db-card-body">
                                <div className="db-stack">
                                    {VEHICLE_TYPES.map((v) => (
                                        <div
                                            key={v.label}
                                            className="db-stack-seg"
                                            style={{ width: `${v.pct}%`, background: v.color }}
                                        />
                                    ))}
                                </div>
                                <div className="db-legend">
                                    {VEHICLE_TYPES.map((v) => (
                                        <div className="db-legend-item" key={v.label}>
                                            <span className="db-dot" style={{ background: v.color }} />
                                            <span>{v.label}</span>
                                            <b>{v.count} ({v.pct}%)</b>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Data tables (3 columns) ── */}
                    <div className="db-tables">

                        {/* Xe vào gần đây */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Xe vào gần đây</p>
                                <p className="db-card-desc">Các lượt xe mới vào bãi</p>
                            </div>
                            <table className="db-table">
                                <thead>
                                    <tr>
                                        <th>BIỂN SỐ</th>
                                        <th>VỊ TRÍ</th>
                                        <th>THỜI GIAN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RECENT_IN.map((row) => (
                                        <tr key={row.plate}>
                                            <td className="db-td-bold">{row.plate}</td>
                                            <td>{row.slot}</td>
                                            <td className="db-td-time">
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>schedule</span>
                                                {' '}{row.time}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Xe ra gần đây */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Xe ra gần đây</p>
                                <p className="db-card-desc">Các lượt xe hoàn tất và rời cổng</p>
                            </div>
                            <div className="db-empty">Chưa có dữ liệu xe ra.</div>
                        </div>

                        {/* Sự cố gần đây */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <div className="db-card-head-row">
                                    <div>
                                        <p className="db-card-title">Sự cố gần đây</p>
                                        <p className="db-card-desc">Các vé xử lý đặc biệt và nhật ký sự cố mới nhất</p>
                                    </div>
                                </div>
                            </div>
                            <table className="db-table">
                                <thead>
                                    <tr>
                                        <th>BIỂN SỐ/TICKET</th>
                                        <th>SỰ CỐ</th>
                                        <th>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {INCIDENTS.map((inc) => (
                                        <tr key={inc.id}>
                                            <td className="db-td-bold">{inc.id}</td>
                                            <td>{inc.type}</td>
                                            <td>
                                                <span className={`db-badge ${inc.statusClass}`}>{inc.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="db-view-all-row">
                                <button
                                    type="button"
                                    className="db-view-all-btn"
                                    onClick={() => setCurrentView('log-management')}
                                >
                                    Xem tất cả nhật ký
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}