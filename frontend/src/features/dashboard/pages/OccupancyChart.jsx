import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const statsData = {
    month: {
        revenue: '125.4M',
        revenueTrend: '+12.5%',
        revenueTrendUp: true,
        inCount: '8,432',
        inTrend: '+5.2%',
        inTrendUp: true,
        outCount: '8,105',
        outTrend: '+4.8%',
        outTrendUp: true,
        newMonthCards: '145',
        newCardsTrend: '-2.1%',
        newCardsTrendUp: false,
        chartData: {
            revenuePath: 'M 100,240 C 200,160 300,160 400,190 C 500,220 600,110 700,140 C 800,160 900,120 1000,70',
            trafficPath: 'M 100,260 C 200,210 300,200 400,230 C 500,250 600,170 700,190 C 800,220 900,180 1000,130',
            points: [
                { x: 175, rev: '82K', tra: '1.2K', label: 'T1' },
                { x: 325, rev: '95K', tra: '1.45K', label: 'T2' },
                { x: 475, rev: '110K', tra: '1.65K', label: 'T3' },
                { x: 625, rev: '98K', tra: '1.55K', label: 'T4' },
                { x: 775, rev: '130K', tra: '2.05K', label: 'T5' },
                { x: 925, rev: '142K', tra: '2.4K', label: 'T6' }
            ]
        },
        transactions: [
            { id: '#TXN-8439', plate: '30A-123.45', type: 'Ô tô con', time: '10:45 - 24/10/2023', amount: '50.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8438', plate: '29C-678.90', type: 'Ô tô con', time: '10:42 - 24/10/2023', amount: '70.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8437', plate: '59X1-555.55', type: 'Xe máy', time: '10:30 - 24/10/2023', amount: '5.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8436', plate: '30H-992.18', type: 'Xe máy', time: '09:55 - 24/10/2023', amount: '5.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8435', plate: '51F-102.93', type: 'Ô tô con', time: '09:12 - 24/10/2023', amount: '60.000đ', status: 'Hoàn thành' }
        ]
    },
    week: {
        revenue: '31.2M',
        revenueTrend: '+8.4%',
        revenueTrendUp: true,
        inCount: '2,110',
        inTrend: '+3.1%',
        inTrendUp: true,
        outCount: '2,045',
        outTrend: '+2.9%',
        outTrendUp: true,
        newMonthCards: '38',
        newCardsTrend: '+4.5%',
        newCardsTrendUp: true,
        chartData: {
            revenuePath: 'M 100,220 C 200,180 300,140 400,170 C 500,200 600,120 700,90 C 800,110 900,130 1000,80',
            trafficPath: 'M 100,240 C 200,210 300,180 400,200 C 500,220 600,160 700,130 C 800,150 900,160 1000,110',
            points: [
                { x: 160, rev: '25K', tra: '0.6K', label: 'Thứ 2' },
                { x: 290, rev: '40K', tra: '0.9K', label: 'Thứ 3' },
                { x: 420, rev: '35K', tra: '0.8K', label: 'Thứ 4' },
                { x: 550, rev: '30K', tra: '0.7K', label: 'Thứ 5' },
                { x: 680, rev: '55K', tra: '1.2K', label: 'Thứ 6' },
                { x: 810, rev: '50K', tra: '1.1K', label: 'Thứ 7' },
                { x: 940, rev: '60K', tra: '1.3K', label: 'Chủ Nhật' }
            ]
        },
        transactions: [
            { id: '#TXN-8439', plate: '30A-123.45', type: 'Ô tô con', time: '10:45 - 24/10/2023', amount: '50.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8438', plate: '29C-678.90', type: 'Xe tải nhẹ', time: '10:42 - 24/10/2023', amount: '70.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8437', plate: '59X1-555.55', type: 'Xe máy', time: '10:30 - 24/10/2023', amount: '5.000đ', status: 'Hoàn thành' }
        ]
    },
    day: {
        revenue: '4.8M',
        revenueTrend: '+15.2%',
        revenueTrendUp: true,
        inCount: '320',
        inTrend: '+8.5%',
        inTrendUp: true,
        outCount: '305',
        outTrend: '+7.4%',
        outTrendUp: true,
        newMonthCards: '6',
        newCardsTrend: '0.0%',
        newCardsTrendUp: true,
        chartData: {
            revenuePath: 'M 100,260 C 200,220 300,180 400,190 C 500,160 600,100 700,110 C 800,140 900,90 1000,60',
            trafficPath: 'M 100,280 C 200,240 300,200 400,210 C 500,190 600,130 700,140 C 800,170 900,120 1000,90',
            points: [
                { x: 160, rev: '10K', tra: '0.1K', label: '00:00' },
                { x: 290, rev: '15K', tra: '0.2K', label: '04:00' },
                { x: 420, rev: '30K', tra: '0.4K', label: '08:00' },
                { x: 550, rev: '45K', tra: '0.6K', label: '12:00' },
                { x: 680, rev: '55K', tra: '0.8K', label: '16:00' },
                { x: 810, rev: '60K', tra: '0.9K', label: '20:00' },
                { x: 940, rev: '75K', tra: '1.1K', label: '23:59' }
            ]
        },
        transactions: [
            { id: '#TXN-8439', plate: '30A-123.45', type: 'Ô tô con', time: '10:45 - 24/10/2023', amount: '50.000đ', status: 'Hoàn thành' },
            { id: '#TXN-8438', plate: '29C-678.90', type: 'Xe tải nhẹ', time: '10:42 - 24/10/2023', amount: '70.000đ', status: 'Hoàn thành' }
        ]
    }
};

export default function OccupancyChart() {
    const { user, userRole, logout } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [showDropdown, setShowDropdown] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    const currentData = statsData[selectedPeriod];

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // Calculate user initials
    const userEmail = user?.email || 'admin@parkflow.com';
    const userInitials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.substring(0, 2).toUpperCase()
        : userEmail.substring(0, 2).toUpperCase();

    return (
        <section className="stats-dashboard-page">
            {/* Top Navigation Header */}
            <header className="stats-top-bar">
                <button className="stats-back-btn" onClick={() => navigate('/login/dashboard')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Thoát
                </button>
                <h1 className="stats-page-title">Thống kê tổng quát</h1>
                <div className="stats-header-right">
                    <button className="stats-bell-btn">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>

                    <div className="avatar-wrapper" ref={dropdownRef}>
                        <div className="stats-profile" onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer' }}>
                            <div className="profile-text">
                                <span className="profile-name">{userEmail}</span>
                            </div>
                            <div className="profile-avatar">{userInitials[0]}</div>
                        </div>

                        {showDropdown && (
                            <div className="user-dropdown" style={{ top: '50px' }}>
                                <div className="user-dropdown-info">
                                    <div className="user-dropdown-email">{userEmail}</div>
                                    <div className="user-dropdown-role">{getRoleLabel(userRole)}</div>
                                </div>
                                <button
                                    type="button"
                                    className="user-dropdown-item"
                                    onClick={handleLogout}
                                >
                                    <span className="material-symbols-outlined">logout</span>
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>


            <div className="stats-container">
                {/* Time Range Filter Card */}
                <div className="filter-card">
                    <div className="filter-group">
                        <label className="filter-label">Khoảng thời gian</label>
                        <div className="select-input-wrapper">
                            <span className="material-symbols-outlined select-calendar-icon">calendar_today</span>
                            <select
                                className="filter-select"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option value="day">Hôm nay</option>
                                <option value="week">Tuần này</option>
                                <option value="month">Tháng này</option>
                            </select>
                        </div>
                    </div>
                    <button className="filter-btn">
                        <span className="material-symbols-outlined">filter_list</span>
                        Lọc dữ liệu
                    </button>
                </div>

                {/* 4 Stats Cards Grid */}
                <div className="stats-cards-grid">
                    {/* Revenue Card */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">TỔNG DOANH THU</p>
                                <h2 className="stat-card-value">{currentData.revenue}</h2>
                            </div>
                            <div className="stat-card-icon-wrapper wallet-bg">
                                <span className="material-symbols-outlined text-orange">account_balance_wallet</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className={`trend-tag ${currentData.revenueTrendUp ? 'trend-up' : 'trend-down'}`}>
                                {currentData.revenueTrendUp ? '▲' : '▼'} {currentData.revenueTrend}
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                        </div>
                    </div>

                    {/* Entries Card */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">LƯỢT XE VÀO</p>
                                <h2 className="stat-card-value">{currentData.inCount}</h2>
                            </div>
                            <div className="stat-card-icon-wrapper login-bg">
                                <span className="material-symbols-outlined text-blue">login</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className={`trend-tag ${currentData.inTrendUp ? 'trend-up' : 'trend-down'}`}>
                                {currentData.inTrendUp ? '▲' : '▼'} {currentData.inTrend}
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                        </div>
                    </div>

                    {/* Exits Card */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">LƯỢT XE RA</p>
                                <h2 className="stat-card-value">{currentData.outCount}</h2>
                            </div>
                            <div className="stat-card-icon-wrapper logout-bg">
                                <span className="material-symbols-outlined text-red">logout</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className={`trend-tag ${currentData.outTrendUp ? 'trend-up' : 'trend-down'}`}>
                                {currentData.outTrendUp ? '▲' : '▼'} {currentData.outTrend}
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                        </div>
                    </div>

                    {/* Month Card Registers Card */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">VÉ THÁNG ĐĂNG KÝ MỚI</p>
                                <h2 className="stat-card-value">{currentData.newMonthCards}</h2>
                            </div>
                            <div className="stat-card-icon-wrapper monitor-bg">
                                <span className="material-symbols-outlined text-purple">desktop_windows</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className={`trend-tag ${currentData.newCardsTrendUp ? 'trend-up' : 'trend-down'}`}>
                                {currentData.newCardsTrendUp ? '▲' : '▼'} {currentData.newCardsTrend}
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                        </div>
                    </div>
                </div>

                <div className="chart-panel-card">
                    <div className="chart-panel-header">
                        <h3>Biểu đồ Doanh thu & Lưu lượng</h3>
                        <a href="#details" className="details-link" onClick={(e) => e.preventDefault()}>Xem chi tiết</a>
                    </div>

                    <div className="chart-svg-container">
                        <svg className="analytics-svg" viewBox="0 0 1100 420" preserveAspectRatio="none" style={{ width: '100%', height: 'auto', display: 'block' }}>
                            {/* Grid Lines & Labels */}
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                const y = 350 - (i * 35); // Range = 280px. 350 is 0, 70 is max
                                return (
                                    <g key={`grid-${i}`}>
                                        <line x1="120" y1={y} x2="980" y2={y} stroke="rgba(238, 236, 236, 1)" strokeWidth="1" />
                                        <text x="110" y={y + 5} fill="#6b7280" fontSize="13" textAnchor="end">{i * 20}K</text>
                                        <text x="990" y={y + 5} fill="#6b7280" fontSize="13" textAnchor="start">{(i * 2.5 / 8).toFixed(1)}K</text>
                                    </g>
                                );
                            })}

                            {/* Left Axis Title */}
                            <text x="30" y="210" fill="#888" fontSize="14" transform="rotate(-90 30 210)" textAnchor="middle">Revenue (S$)</text>
                            {/* Right Axis Title */}
                            <text x="1060" y="210" fill="#888" fontSize="14" transform="rotate(90 1060 210)" textAnchor="middle">Traffic (Units)</text>

                            {/* Bars */}
                            {currentData.chartData.points.map((pt, index) => {
                                const BASELINE = 350;
                                const BAR_WIDTH = 38;
                                const GAP = 2;
                                const RANGE_Y = 280;

                                // Extract value from string (e.g., "82K" -> 82)
                                const revValue = parseFloat(pt.rev.replace('K', '')) || 0;
                                const traValue = parseFloat(pt.tra.replace('K', '')) || 0;

                                // Calculate heights relative to 160K max revenue and 2.5K max traffic
                                const revenueHeight = Math.max((revValue / 160) * RANGE_Y, 0);
                                const trafficHeight = Math.max((traValue / 2.5) * RANGE_Y, 0);

                                const revenueX = pt.x - BAR_WIDTH - GAP;
                                const trafficX = pt.x + GAP;

                                return (
                                    <g key={index}>
                                        {/* Cột Doanh thu */}
                                        <rect
                                            x={revenueX}
                                            y={BASELINE - revenueHeight}
                                            width={BAR_WIDTH}
                                            height={revenueHeight}
                                            fill="#d84315"
                                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                            onMouseEnter={() => setTooltip({ x: revenueX + BAR_WIDTH / 2, y: BASELINE - revenueHeight - 35, value: pt.rev })}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                        {/* Cột Lưu lượng */}
                                        <rect
                                            x={trafficX}
                                            y={BASELINE - trafficHeight}
                                            width={BAR_WIDTH}
                                            height={trafficHeight}
                                            fill="#2563eb"
                                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                            onMouseEnter={() => setTooltip({ x: trafficX + BAR_WIDTH / 2, y: BASELINE - trafficHeight - 35, value: pt.tra })}
                                            onMouseLeave={() => setTooltip(null)}
                                        />

                                        {/* X-axis labels */}
                                        <text x={pt.x} y="380" fill="#888" fontSize="14" textAnchor="middle">{pt.label}</text>
                                    </g>
                                );
                            })}

                            {/* Tooltip Overlay */}
                            {tooltip && (
                                <g transform={`translate(${tooltip.x}, ${tooltip.y})`} style={{ pointerEvents: 'none' }}>
                                    <rect x="-24" y="0" width="48" height="26" fill="rgba(30,30,30,0.95)" rx="4" stroke="#444" strokeWidth="1" />
                                    <text x="0" y="18" fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">{tooltip.value}</text>
                                </g>
                            )}
                        </svg>
                    </div>
                    <div className="chart-legend-box">
                        <div className="legend-item">
                            <span className="legend-dot red-dot"></span>
                            <span>Doanh thu (Revenue)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot blue-dot"></span>
                            <span>Lưu lượng (Traffic)</span>
                        </div>
                    </div>
                </div>
                {/* Transactions Table Panel */}
                <div className="table-panel-card">
                    <div className="table-panel-header">
                        <h3>Giao dịch gần đây</h3>
                    </div>

                    <div className="stats-table-wrapper">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>MÃ GD</th>
                                    <th>BIỂN SỐ</th>
                                    <th>LOẠI XE</th>
                                    <th>THỜI GIAN</th>
                                    <th>SỐ TIỀN</th>
                                    <th>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.transactions.map((txn) => (
                                    <tr key={txn.id}>
                                        <td className="txn-id-col">{txn.id}</td>
                                        <td className="font-semibold">{txn.plate}</td>
                                        <td>{txn.type}</td>
                                        <td className="text-gray-500">{txn.time}</td>
                                        <td className="font-semibold text-gray-800">{txn.amount}</td>
                                        <td>
                                            <span className="status-tag success">
                                                {txn.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-panel-footer">
                        <button className="view-all-btn">
                            Xem tất cả
                            <span className="material-symbols-outlined">arrow_right_alt</span>
                        </button>
                    </div>
                </div>
            </div>
        </section >
    );
}
