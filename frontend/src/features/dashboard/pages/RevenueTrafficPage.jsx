import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

// ─── Mock Data ───────────────────────────────────────────────
const barChartData = [
    { label: '00-04', revenue: 20, traffic: 15 },
    { label: '04-08', revenue: 35, traffic: 45 },
    { label: '08-12', revenue: 85, traffic: 95 },
    { label: '12-16', revenue: 75, traffic: 80 },
    { label: '16-20', revenue: 90, traffic: 100 },
    { label: '20-23', revenue: 40, traffic: 50 },
];

const transactions = [
    {
        id: '#KP-88219',
        plate: '51A-992.41',
        type: 'Ô tô 4 chỗ',
        timeIn: '08:15',
        timeOut: '10:45',
        duration: '2h 30m',
        amount: '65.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88220',
        plate: '59C-112.56',
        type: 'Ô tô 7 chỗ',
        timeIn: '09:30',
        timeOut: '11:20',
        duration: '1h 50m',
        amount: '45.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88221',
        plate: '29A-456.88',
        type: 'Xe bán tải',
        timeIn: '10:05',
        timeOut: '14:15',
        duration: '4h 10m',
        amount: '120.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88222',
        plate: '60B-772.33',
        type: 'Xe máy',
        timeIn: '07:00',
        timeOut: '18:30',
        duration: '11h 30m',
        amount: '15.000đ',
        status: 'Đã thanh toán',
    },
];

export default function RevenueTrafficPage() {
    const { user, userRole, logout } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('Hôm nay');
    const [selectedVehicleType, setSelectedVehicleType] = useState('Tất cả phương tiện');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [isFiltering, setIsFiltering] = useState(false);
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

    const handleFilter = () => {
        setIsFiltering(true);
        setTimeout(() => setIsFiltering(false), 800);
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
                <h1 className="stats-page-title">Chi tiết Doanh thu &amp; Lưu lượng</h1>
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

            <div className={`stats-container ${isFiltering ? 'rtp-content--fading' : ''}`}>
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
                                <option>Hôm nay</option>
                                <option>Tuần này</option>
                                <option>Tháng này</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Loại xe</label>
                        <div className="select-input-wrapper">
                            <span className="material-symbols-outlined select-calendar-icon">directions_car</span>
                            <select
                                className="filter-select"
                                value={selectedVehicleType}
                                onChange={(e) => setSelectedVehicleType(e.target.value)}
                            >
                                <option>Tất cả phương tiện</option>
                                <option>Ô tô 4 chỗ</option>
                                <option>Ô tô 7 chỗ</option>
                                <option>Xe máy</option>
                                <option>Xe bán tải</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className={`filter-btn ${isFiltering ? 'rtp-filter-btn--loading' : ''}`}
                        onClick={handleFilter}
                        disabled={isFiltering}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span className={`material-symbols-outlined ${isFiltering ? 'rtp-spin' : ''}`}>
                            {isFiltering ? 'refresh' : 'filter_list'}
                        </span>
                        {isFiltering ? 'Đang tải...' : 'Lọc dữ liệu'}
                    </button>
                </div>

                {/* 2 Stats Cards Grid */}
                <div className="stats-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {/* Xe 4 bánh */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">XE 4 BÁNH</p>
                                <h2 className="stat-card-value">92.150.000đ</h2>
                            </div>
                            <div className="stat-card-icon-wrapper wallet-bg">
                                <span className="material-symbols-outlined text-orange">directions_car</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className="trend-tag trend-up">
                                ▲ +9%
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#0f172a' }}>2,510</strong> lượt xe
                            </span>
                        </div>
                    </div>

                    {/* Xe 2 bánh */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">XE 2 BÁNH</p>
                                <h2 className="stat-card-value">15.800.000đ</h2>
                            </div>
                            <div className="stat-card-icon-wrapper login-bg">
                                <span className="material-symbols-outlined text-blue">moped</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className="trend-tag trend-down">
                                ▼ -2%
                            </span>
                            <span className="trend-lbl">vs tháng trước</span>
                            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#0f172a' }}>3,420</strong> lượt xe
                            </span>
                        </div>
                    </div>
                </div>

                {/* SVG/HTML Chart Panel */}
                <div className="chart-panel-card">
                    <div className="chart-panel-header">
                        <div>
                            <h3>Biểu đồ Doanh thu &amp; Lưu lượng</h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Phân tích mật độ và nguồn thu theo thời gian thực</p>
                        </div>
                        <a href="#details" className="details-link" onClick={(e) => e.preventDefault()}>Xem chi tiết</a>
                    </div>

                    {/* Styled Bar Chart Area */}
                    <div className="rtp-chart-area">
                        {/* Y-axis labels */}
                        <div className="rtp-chart-yaxis">
                            <span>100M</span>
                            <span>75M</span>
                            <span>50M</span>
                            <span>25M</span>
                            <span>0</span>
                        </div>

                        {/* Bars */}
                        <div className="rtp-chart-bars">
                            {barChartData.map((d) => (
                                <div key={d.label} className="rtp-bar-group">
                                    <div className="rtp-bar-pair">
                                        <div
                                            className="rtp-bar rtp-bar--revenue"
                                            style={{ height: `${d.revenue}%` }}
                                            title={`Doanh thu: ${d.revenue}%`}
                                        />
                                        <div
                                            className="rtp-bar rtp-bar--traffic"
                                            style={{ height: `${d.traffic}%` }}
                                            title={`Lưu lượng: ${d.traffic}%`}
                                        />
                                    </div>
                                    <span className="rtp-bar-label">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chart-legend-box" style={{ borderTop: 'none', marginTop: '16px', paddingTop: 0 }}>
                        <div className="legend-item">
                            <span className="legend-dot orange-dot"></span>
                            <span>Doanh thu (Revenue)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#e2e2e5' }}></span>
                            <span>Lưu lượng (Traffic)</span>
                        </div>
                    </div>
                </div>

                {/* Transactions Table Panel */}
                <div className="table-panel-card">
                    <div className="table-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Giao dịch gần nhất</h3>
                        <a
                            href="#view-all"
                            className="details-link"
                            onClick={(e) => e.preventDefault()}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            Xem toàn bộ
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                        </a>
                    </div>

                    <div className="stats-table-wrapper">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Biển số</th>
                                    <th>Loại xe</th>
                                    <th>Vào / Ra</th>
                                    <th>Thời lượng</th>
                                    <th>Số tiền</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className={selectedRow === txn.id ? 'rtp-row--selected' : ''}
                                        onClick={() => setSelectedRow(selectedRow === txn.id ? null : txn.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="txn-id-col" style={{ fontFamily: 'monospace' }}>{txn.id}</td>
                                        <td className="font-semibold" style={{ fontWeight: 700 }}>{txn.plate}</td>
                                        <td>
                                            <span className="rtp-type-badge">{txn.type}</span>
                                        </td>
                                        <td>{txn.timeIn} → {txn.timeOut}</td>
                                        <td>{txn.duration}</td>
                                        <td className="font-semibold" style={{ fontWeight: 700 }}>{txn.amount}</td>
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

                    <div className="table-panel-footer" style={{ padding: '16px 24px', backgroundColor: '#fafbfb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Hiển thị 1 - 4 của 1,240 giao dịch</span>
                        <div className="rtp-pagination" style={{ display: 'flex', gap: '8px' }}>
                            <button className="rtp-page-btn" aria-label="Trang trước">
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button className="rtp-page-btn" aria-label="Trang sau">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
