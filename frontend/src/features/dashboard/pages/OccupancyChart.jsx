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
                { x: 100, rev: '50K', tra: '1.2K', label: 'Tuần 1' },
                { x: 250, rev: '90K', tra: '1.8K', label: 'Tuần 2' },
                { x: 400, rev: '110K', tra: '1.6K', label: 'Tuần 3' },
                { x: 550, rev: '85K', tra: '1.4K', label: 'Tuần 4' },
                { x: 700, rev: '135K', tra: '2.4K', label: 'Tuần 5' },
                { x: 850, rev: '115K', tra: '2.0K', label: 'Tuần 6' },
                { x: 1000, rev: '160K', tra: '2.8K', label: 'Tuần 7' }
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
                { x: 100, rev: '25K', tra: '0.6K', label: 'Thứ 2' },
                { x: 250, rev: '40K', tra: '0.9K', label: 'Thứ 3' },
                { x: 400, rev: '35K', tra: '0.8K', label: 'Thứ 4' },
                { x: 550, rev: '30K', tra: '0.7K', label: 'Thứ 5' },
                { x: 700, rev: '55K', tra: '1.2K', label: 'Thứ 6' },
                { x: 850, rev: '50K', tra: '1.1K', label: 'Thứ 7' },
                { x: 1000, rev: '60K', tra: '1.3K', label: 'Chủ Nhật' }
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
                { x: 100, rev: '10K', tra: '0.1K', label: '00:00' },
                { x: 250, rev: '15K', tra: '0.2K', label: '04:00' },
                { x: 400, rev: '30K', tra: '0.4K', label: '08:00' },
                { x: 550, rev: '45K', tra: '0.6K', label: '12:00' },
                { x: 700, rev: '55K', tra: '0.8K', label: '16:00' },
                { x: 850, rev: '60K', tra: '0.9K', label: '20:00' },
                { x: 1000, rev: '75K', tra: '1.1K', label: '23:59' }
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

                {/* SVG Chart Panel */}
                <div className="chart-panel-card">
                    <div className="chart-panel-header">
                        <h3>Biểu đồ Doanh thu & Lưu lượng</h3>
                        <a href="#details" className="details-link" onClick={(e) => e.preventDefault()}>Xem chi tiết</a>
                    </div>

                    <div className="chart-svg-container">
                        <svg className="analytics-svg" viewBox="0 0 1100 320" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="80" y1="50" x2="1050" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="80" y1="120" x2="1050" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="80" y1="190" x2="1050" y2="190" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="80" y1="260" x2="1050" y2="260" stroke="#cbd5e1" strokeWidth="2" /> {/* X Axis baseline */}

                            {/* Left Y-Axis labels */}
                            <text x="40" y="55" className="svg-axis-lbl" textAnchor="middle">150K</text>
                            <text x="40" y="125" className="svg-axis-lbl" textAnchor="middle">100K</text>
                            <text x="40" y="195" className="svg-axis-lbl" textAnchor="middle">50K</text>

                            {/* Right Y-Axis labels */}
                            <text x="1080" y="55" className="svg-axis-lbl" textAnchor="middle">3K</text>
                            <text x="1080" y="125" className="svg-axis-lbl" textAnchor="middle">2K</text>
                            <text x="1080" y="195" className="svg-axis-lbl" textAnchor="middle">1K</text>

                            {/* Left Axis Title */}
                            <text x="15" y="150" className="svg-axis-title-left" transform="rotate(-90 15 150)" textAnchor="middle">Revenue (S$)</text>
                            {/* Right Axis Title */}
                            <text x="1095" y="150" className="svg-axis-title-right" transform="rotate(90 1095 150)" textAnchor="middle">Traffic (Units)</text>

                            {/* Paths */}
                            <path
                                d={currentData.chartData.revenuePath}
                                fill="none"
                                stroke="#c2410c"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                            <path
                                d={currentData.chartData.trafficPath}
                                fill="none"
                                stroke="#1d4ed8"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />

                            {/* Data Points */}
                            {currentData.chartData.points.map((pt, index) => (
                                <g key={index}>
                                    <circle cx={pt.x} cy={parseInt(currentData.chartData.revenuePath.split(' ')[index * 2 + 1].split(',')[1]) || 150} r="6" fill="#c2410c" stroke="#ffffff" strokeWidth="2" className="chart-dot" />
                                    <circle cx={pt.x} cy={parseInt(currentData.chartData.trafficPath.split(' ')[index * 2 + 1].split(',')[1]) || 180} r="6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" className="chart-dot" />

                                    {/* X-axis labels */}
                                    <text x={pt.x} y="290" className="svg-x-lbl" textAnchor="middle">{pt.label}</text>
                                </g>
                            ))}
                        </svg>
                    </div>

                    <div className="chart-legend-box">
                        <div className="legend-item">
                            <span className="legend-dot orange-dot"></span>
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
        </section>
    );
}
