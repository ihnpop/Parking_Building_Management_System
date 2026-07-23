import { useState, useEffect, useCallback } from 'react';

/** Trả về chuỗi yyyy-MM-dd theo timezone Việt Nam */
function todayVN() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}
/** Trả về chuỗi yyyy-MM theo timezone Việt Nam */
function thisMonthVN() {
    return todayVN().slice(0, 7);
}
import DashboardShell from '../../../components/layout/DashboardShell';
import { useAuth } from '../../../context/AuthContext';

// Import các phân hệ chức năng con của bạn
import CardPage from './CardPage';
import MonthCardPage from './MonthCardPage';
import LostCardLogPage from './LostCardLogPage';
import MonthCardLogPage from './MonthCardLogPage';
import CasualCardLogPage from './CasualCardLogPage';
import LoginLogPage from './LoginLogPage';
import UserManagementPage from './UserManagementPage';
import RevenueTrafficPage from './RevenueTrafficPage';
import AdjustPricesPage from './AdjustPricesPage';
import ManagerDashboardPage from './ManagerDashboardPage';

// Import Modal chi tiết doanh thu
import RevenueTodayModal from '../components/RevenueTodayModal';
import RevenueMonthModal from '../components/RevenueMonthModal';

// ─── Dashboard service ────────────────────────────────────────────────────────
import {
    fetchAllDashboardData,
    formatVND,
    dashboardFallbackData,
} from '../../../service/dashboardApi';

// ─── Fallback mock – chỉ dùng cho chart "Xu hướng doanh thu" khi payment chưa có seed ──
// TODO: replace with real database field when available (payment chưa có dữ liệu seed)
const WEEK_BARS = dashboardFallbackData.revenueTrendBars;
const MAX_BAR = dashboardFallbackData.revenueTrendMaxBar;

export default function DashboardView() {
    const { userRole, user } = useAuth();

    // Lấy thông tin email người dùng để xác định vai trò chính xác (đồng bộ với Sidebar và DashboardShell)
    const userEmail = user?.email || '';
    const email = userEmail.toLowerCase().trim();

    // Xác định vai trò chuẩn của người dùng
    let computedRole = userRole ? userRole.toUpperCase() : 'STAFF';
    if (email === 'admin@gmail.com') computedRole = 'ADMIN';
    else if (email === 'manager@gmail.com') computedRole = 'MANAGER';
    else if (email === 'staff@gmail.com') computedRole = 'STAFF';

    // eslint-disable-next-line no-unused-vars
    const userInitials = (user?.email || 'A').charAt(0).toUpperCase();

    const MANAGER_ALLOWED_VIEWS = ['manager-dashboard', 'card-management', 'adjust-prices', 'log-management'];
    const ADMIN_ALLOWED_VIEWS = ['user-management', 'dashboard', 'revenue-traffic'];

    // Trả về tab đầu tiên trên Sidebar của từng vai trò
    const getDefaultViewForRole = (r) => {
        if (r === 'ADMIN') return 'user-management'; // Tab 1 của Admin: Phân quyền
        if (r === 'MANAGER') return 'manager-dashboard'; // Tab 1 của Manager: Bảng điều khiển Manager
        return 'system'; // Tab 1 của Staff
    };

    // Khởi tạo tab hiện tại: Dùng savedView nếu hợp lệ với vai trò, ngược lại mặc định dùng tab đầu tiên của Sidebar
    const [currentView, setCurrentView] = useState(() => {
        const savedView = localStorage.getItem('dashboard_current_view');
        if (computedRole === 'MANAGER' && savedView && MANAGER_ALLOWED_VIEWS.includes(savedView)) {
            return savedView;
        }
        if (computedRole === 'ADMIN' && savedView && ADMIN_ALLOWED_VIEWS.includes(savedView)) {
            return savedView;
        }
        return getDefaultViewForRole(computedRole);
    });

    // Cập nhật localStorage khi tab hiện tại thay đổi
    useEffect(() => {
        if (currentView) {
            localStorage.setItem('dashboard_current_view', currentView);
        }
    }, [currentView]);

    // Kiểm tra ranh giới phân quyền (Role Boundary Check): Ngăn chặn việc xem trái phép màn hình không thuộc vai trò
    useEffect(() => {
        if (!computedRole) return;

        if (computedRole === 'STAFF' && currentView !== 'system') {
            // Staff chỉ được truy cập giao diện hệ thống
            setCurrentView('system');
        } else if (computedRole === 'MANAGER' && !MANAGER_ALLOWED_VIEWS.includes(currentView)) {
            // Manager KHÔNG có quyền xem Bảng điều khiển Admin (dashboard) hoặc Phân quyền (user-management)
            // Tự động chuyển về tab mặc định của Manager là Bảng điều khiển Manager (manager-dashboard)
            setCurrentView('manager-dashboard');
        } else if (computedRole === 'ADMIN' && !ADMIN_ALLOWED_VIEWS.includes(currentView)) {
            // Admin không truy cập tab công việc riêng của Manager, chuyển về Bảng điều khiển (dashboard)
            setCurrentView('dashboard');
        }
    }, [computedRole, currentView]);

    const [activeCardTab, setActiveCardTab] = useState('Thẻ lượt');
    const [activeLogTab, setActiveLogTab] = useState('Quẹt thẻ');

    // ── KPI Time Filter (lifted from CasualCardLogPage) ───────────────────
    const [kpiTimeFilter, setKpiTimeFilter] = useState('day');
    const [kpiDate, setKpiDate] = useState(todayVN);
    const [kpiMonth, setKpiMonth] = useState(thisMonthVN);
    const [selectedPeriod, setSelectedPeriod] = useState('30 ngày qua');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Modal state
    const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);
    const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);

    // ─── KPI state ────────────────────────────────────────────────────────────
    const [stats, setStats] = useState({
        todayTraffic: 0,
        activeSessions: 0,
        emptySlots: 0,
        usedSlots: 0,
        incidents: 0,
        revenueToday: 0,
        revenueMonth: 0,
    });

    // ─── Chart / table state ──────────────────────────────────────────────────
    const [hourlyData, setHourlyData] = useState(Array(24).fill(0));
    const [floorData, setFloorData] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [recentIn, setRecentIn] = useState([]);
    const [recentOut, setRecentOut] = useState([]);
    const [incidents, setIncidents] = useState([]);

    // ─── Load data từ Supabase ────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchAllDashboardData();

            // Tính tổng lượt xe ra/vào hôm nay dựa trên biểu đồ lưu lượng theo giờ (hourlyTraffic)
            const totalTodayTraffic = Array.isArray(data.hourlyTraffic)
                ? data.hourlyTraffic.reduce((sum, val) => sum + Number(val || 0), 0)
                : 0;

            setStats({
                todayTraffic: totalTodayTraffic,
                activeSessions: data.activeSessions,
                emptySlots: data.availableSlots,
                usedSlots: data.occupiedSlots,
                incidents: data.todayIncidents,
                revenueToday: data.todayRevenue,
                revenueMonth: data.monthRevenue,
            });
            setHourlyData(data.hourlyTraffic);
            setFloorData(data.floorOccupancy);
            setVehicleTypes(data.vehicleTypeDistribution);
            setRecentIn(data.recentEntries);
            setRecentOut(data.recentExits);
            setIncidents(data.recentIncidents);
        } catch (err) {
            // Không crash Dashboard dù lỗi bất ngờ
            console.error('[DashboardView] loadData error:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Load khi mở tab dashboard
    useEffect(() => {
        if (currentView === 'dashboard') {
            loadData();
        }
    }, [currentView, loadData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setRefreshTrigger(prev => prev + 1);
        loadData();
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

    const maxHourly = Math.max(...hourlyData, 1);

    return (
        <DashboardShell currentTab={currentView} onTabSelect={(tab) => setCurrentView(tab)}>

            {/* 0. VIEW BẢNG ĐIỀU KHIỂN MANAGER */}
            {currentView === 'manager-dashboard' && (
                <div style={{ padding: '0 24px 24px 24px' }}>
                    <ManagerDashboardPage />
                </div>
            )}

            {/* 1. VIEW QUẢN LÝ THẺ */}
            {currentView === 'card-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 24px 24px 24px' }}>
                    <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f0f0f0', marginTop: '0' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 24px 24px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f0f0', marginTop: '0', flexWrap: 'nowrap' }}>
                        {/* Tab Menu - Không cho phép xuống dòng */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {renderTabButton('Nhật ký mất thẻ', activeLogTab === 'Quẹt thẻ', () => setActiveLogTab('Quẹt thẻ'))}
                            {renderTabButton('Nhật ký thẻ lượt', activeLogTab === 'Thẻ lượt', () => setActiveLogTab('Thẻ lượt'))}
                            {renderTabButton('Nhật ký thẻ tháng', activeLogTab === 'Vé tháng', () => setActiveLogTab('Vé tháng'))}
                            {renderTabButton('Nhật ký đăng nhập', activeLogTab === 'Đăng nhập', () => setActiveLogTab('Đăng nhập'))}
                        </div>
                        {/* KPI Time Filter – Áp dụng cho tất cả các tab */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px', flexShrink: 0 }}>
                            <div className="kpi-seg-group">
                                <button
                                    type="button"
                                    className={`kpi-seg-btn ${kpiTimeFilter === 'day' ? 'active' : ''}`}
                                    onClick={() => setKpiTimeFilter('day')}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}>today</span>
                                    Theo ngày
                                </button>
                                <button
                                    type="button"
                                    className={`kpi-seg-btn ${kpiTimeFilter === 'month' ? 'active' : ''}`}
                                    onClick={() => setKpiTimeFilter('month')}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: 4 }}>calendar_month</span>
                                    Theo tháng
                                </button>
                            </div>
                            {kpiTimeFilter === 'day' ? (
                                <input
                                    type="date"
                                    className="kpi-date-picker"
                                    style={{ width: '160px' }}
                                    value={kpiDate}
                                    onChange={(e) => setKpiDate(e.target.value)}
                                />
                            ) : (
                                <input
                                    type="month"
                                    className="kpi-date-picker"
                                    style={{ width: '160px' }}
                                    value={kpiMonth}
                                    onChange={(e) => setKpiMonth(e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: '5px' }}>
                        {activeLogTab === 'Quẹt thẻ' && <LostCardLogPage kpiTimeFilter={kpiTimeFilter} kpiDate={kpiDate} kpiMonth={kpiMonth} />}
                        {activeLogTab === 'Thẻ lượt' && <CasualCardLogPage kpiTimeFilter={kpiTimeFilter} kpiDate={kpiDate} kpiMonth={kpiMonth} />}
                        {activeLogTab === 'Vé tháng' && <MonthCardLogPage kpiTimeFilter={kpiTimeFilter} kpiDate={kpiDate} kpiMonth={kpiMonth} refreshTrigger={refreshTrigger} />}
                        {activeLogTab === 'Đăng nhập' && <LoginLogPage kpiTimeFilter={kpiTimeFilter} kpiDate={kpiDate} kpiMonth={kpiMonth} />}
                    </div>
                </div>
            )}

            {/* 3. VIEW PHÂN QUYỀN NGƯỜI DÙNG */}
            {currentView === 'user-management' && (
                <div style={{ marginTop: '0', padding: '0 24px 24px 24px' }}>
                    <UserManagementPage />
                </div>
            )}

            {/* 5. VIEW CHI TIẾT DOANH THU & LƯU LƯỢNG */}
            {currentView === 'revenue-traffic' && (
                <div style={{ marginTop: '0', padding: '0 24px 24px 24px' }}>
                    <RevenueTrafficPage />
                </div>
            )}

            {/* 6. VIEW ĐIỀU CHỈNH GIÁ (Chỉ Manager) */}
            {currentView === 'adjust-prices' && (
                <div style={{ marginTop: '0', padding: '0 24px 24px 24px' }}>
                    <AdjustPricesPage />
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
                            disabled={isRefreshing || isLoading}
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            {isRefreshing ? 'Đang cập nhật…' : 'Làm mới'}
                        </button>
                    </div>

                    {/* ── KPI Cards ── */}
                    <div className="db-kpis">
                        {/* Lượt xe ra/vào hôm nay – Móc từ dữ liệu tổng hợp lưu lượng theo giờ */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>LƯỢT XE RA/VÀO HÔM NAY</span>
                                <span className="db-kpi-icon" style={{ color: '#3B82F6' }}>
                                    <span className="material-symbols-outlined">swap_vert</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.todayTraffic} lượt</div>
                            <div className="db-kpi-note">Tổng lượt xe ra/vào trong ngày</div>
                            <div className="db-kpi-status-cue" style={{ color: '#3b82f6' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>sync</span>
                                <span>Cập nhật tự động</span>
                            </div>
                        </div>

                        {/* Chỗ trống – từ slot.status = 'Sẵn sàng' */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>CHỖ TRỐNG KHẢ DỤNG</span>
                                <span className="db-kpi-icon" style={{ color: '#14b8a6' }}>
                                    <span className="material-symbols-outlined">local_parking</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.emptySlots} chỗ</div>
                            <div className="db-kpi-note">
                                {computedRole === 'ADMIN' ? 'Tổng chỗ trống tất cả các tòa nhà' : 'Chỗ trống thuộc tòa nhà được phân công'}
                            </div>
                            <div className="db-kpi-status-cue" style={{ color: '#10b981' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
                                <span>{computedRole === 'ADMIN' ? 'Tất cả bãi xe' : 'Bãi xe được phân công'}</span>
                            </div>
                        </div>

                        {/* Chỗ đã sử dụng – từ slot.status / parking_order active */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>CHỖ ĐÃ SỬ DỤNG</span>
                                <span className="db-kpi-icon" style={{ color: '#60A5FA' }}>
                                    <span className="material-symbols-outlined">event_seat</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.usedSlots} chỗ</div>
                            <div className="db-kpi-note">Các chỗ đang được sử dụng</div>
                            <div className="db-kpi-status-cue" style={{ color: '#6366f1' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>pie_chart</span>
                                <span>Tỷ lệ lấp đầy {Math.round((stats.usedSlots / ((stats.usedSlots + stats.emptySlots) || 1)) * 100)}%</span>
                            </div>
                        </div>

                        {/* Sự cố hôm nay – từ card_lost_log + incident_report */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>SỰ CỐ HÔM NAY</span>
                                <span className="db-kpi-icon" style={{ color: '#ef4444' }}>
                                    <span className="material-symbols-outlined">warning</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.incidents} sự cố</div>
                            <div className="db-kpi-note">Các trường hợp ngoại lệ đã ghi nhận</div>
                            <div className="db-kpi-status-cue" style={{ color: stats.incidents > 0 ? '#ef4444' : '#10b981' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{stats.incidents > 0 ? 'warning' : 'verified'}</span>
                                <span>{stats.incidents > 0 ? 'Cần kiểm tra ngay' : 'Hoạt động an toàn'}</span>
                            </div>
                        </div>

                        {/* Doanh thu hôm nay – từ payment.status = 'Đã trả' */}
                        <div className="db-kpi db-kpi--clickable" onClick={() => setIsTodayModalOpen(true)}>
                            <div className="db-kpi-head">
                                <span>DOANH THU HÔM NAY</span>
                                <span className="db-kpi-icon" style={{ color: '#059669' }}>
                                    <span className="material-symbols-outlined">payments</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{formatVND(stats.revenueToday)}</div>
                            <div className="db-kpi-note">Tiền mặt &amp; QR ngân hàng đã thu</div>
                            <div className="db-kpi-clickable-cue">
                                <span>Nhấn để xem chi tiết</span>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </div>
                        </div>

                        {/* Doanh thu tháng – từ payment.status = 'Đã trả' tháng này */}
                        <div className="db-kpi db-kpi--clickable" onClick={() => setIsMonthModalOpen(true)}>
                            <div className="db-kpi-head">
                                <span>DOANH THU THÁNG</span>
                                <span className="db-kpi-icon" style={{ color: '#1D4ED8' }}>
                                    <span className="material-symbols-outlined">trending_up</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{formatVND(stats.revenueMonth)}</div>
                            <div className="db-kpi-note">Tổng doanh thu 30 ngày gần nhất</div>
                            <div className="db-kpi-clickable-cue">
                                <span>Nhấn để xem chi tiết</span>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Charts grid (2 columns) ── */}
                    <div className="db-grid2">

                        {/* Lượt xe theo giờ – từ entry_exit_log / parking_sessions */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Lượt xe theo giờ</p>
                                <p className="db-card-desc">Phân bố lượt xe vào trung bình theo giờ (08:00 – 22:00)</p>
                            </div>
                            <div className="db-card-body">
                                <div className="db-bar-chart">
                                    {hourlyData.map((val, idx) => (
                                        <div className="db-bar-wrap" key={idx}>
                                            <div
                                                className="db-bar"
                                                style={{ height: `${Math.max(5, (val / maxHourly) * 90)}%` }}
                                            />
                                            <span className="db-x">
                                                {String(idx).padStart(2, '0')}h
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tỷ lệ lấp đầy theo tầng – từ slot → area → floor */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Tỷ lệ lấp đầy theo tầng</p>
                                <p className="db-card-desc">Mức sử dụng công suất theo từng tầng</p>
                            </div>
                            <div className="db-card-body">
                                {isLoading ? (
                                    <div style={{ color: '#999', fontSize: '0.85rem' }}>Đang tải…</div>
                                ) : floorData.length === 0 ? (
                                    <div className="db-empty">Chưa có dữ liệu tầng.</div>
                                ) : (
                                    floorData.map((floor) => (
                                        <div className="db-floor" key={floor.floorId}>
                                            <div className="db-floor-top">
                                                <span>▧ {floor.floorName}</span>
                                                <span>{floor.occupiedSlots} / {floor.totalSlots} slots ({floor.percentage}%)</span>
                                            </div>
                                            <div className="db-track">
                                                <div className="db-fill" style={{ width: `${floor.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Xu hướng doanh thu – TODO: replace when payment has seed data */}
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
                                        {/* TODO: replace with real database field when available */}
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

                        {/* Phân loại phương tiện – từ parking_order / parking_sessions → vehicle_type */}
                        <div className="db-card db-chart-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Phân loại phương tiện</p>
                                <p className="db-card-desc">Tỷ lệ các loại phương tiện đang đỗ trong bãi</p>
                            </div>
                            <div className="db-card-body">
                                {vehicleTypes.length === 0 ? (
                                    <div className="db-empty">Không có xe nào đang trong bãi.</div>
                                ) : (
                                    <>
                                        <div className="db-stack">
                                            {vehicleTypes.map((v) => (
                                                <div
                                                    key={v.vehicleTypeName}
                                                    className="db-stack-seg"
                                                    style={{ width: `${v.percentage}%`, background: v.color }}
                                                />
                                            ))}
                                        </div>
                                        <div className="db-legend">
                                            {vehicleTypes.map((v) => (
                                                <div className="db-legend-item" key={v.vehicleTypeName}>
                                                    <span className="db-dot" style={{ background: v.color }} />
                                                    <span>{v.vehicleTypeName}</span>
                                                    <b>{v.count} ({v.percentage}%)</b>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Data tables (3 columns) ── */}
                    <div className="db-tables">

                        {/* Xe vào gần đây – từ entry_exit_log / parking_sessions */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Xe vào gần đây</p>
                                <p className="db-card-desc">Các lượt xe mới vào bãi</p>
                            </div>
                            {recentIn.length === 0 ? (
                                <div className="db-empty">Chưa có dữ liệu xe vào.</div>
                            ) : (
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>BIỂN SỐ</th>
                                            <th>VỊ TRÍ</th>
                                            <th>THỜI GIAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentIn.map((row) => (
                                            <tr key={row.id}>
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
                            )}
                        </div>

                        {/* Xe ra gần đây – từ entry_exit_log / parking_sessions */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <p className="db-card-title">Xe ra gần đây</p>
                                <p className="db-card-desc">Các lượt xe hoàn tất và rời cổng</p>
                            </div>
                            {recentOut.length === 0 ? (
                                <div className="db-empty">Chưa có dữ liệu xe ra.</div>
                            ) : (
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>BIỂN SỐ</th>
                                            <th>VỊ TRÍ</th>
                                            <th>THỜI GIAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOut.map((row) => (
                                            <tr key={row.id}>
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
                            )}
                        </div>

                        {/* Sự cố gần đây – từ card_lost_log + incident_report */}
                        <div className="db-card db-table-card">
                            <div className="db-card-head">
                                <div className="db-card-head-row">
                                    <div>
                                        <p className="db-card-title">Sự cố gần đây</p>
                                        <p className="db-card-desc">Các vé xử lý đặc biệt và nhật ký sự cố mới nhất</p>
                                    </div>
                                </div>
                            </div>
                            {incidents.length === 0 ? (
                                <div className="db-empty">Chưa có sự cố nào.</div>
                            ) : (
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>BIỂN SỐ/TICKET</th>
                                            <th>SỰ CỐ</th>
                                            <th>TRẠNG THÁI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incidents.map((inc) => (
                                            <tr key={inc.id}>
                                                <td className="db-td-bold">{inc.identifier}</td>
                                                <td>{inc.type}</td>
                                                <td>
                                                    <span className={`db-badge ${inc.statusClass}`}>{inc.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
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

            {/* Modals Chi Tiết Doanh Thu */}
            <RevenueTodayModal
                isOpen={isTodayModalOpen}
                onClose={() => setIsTodayModalOpen(false)}
            />
            <RevenueMonthModal
                isOpen={isMonthModalOpen}
                onClose={() => setIsMonthModalOpen(false)}
            />
        </DashboardShell>
    );
}