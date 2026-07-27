import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../../../config/supabaseClient';

import { 
    todayVN, 
    thisMonthVN, 
    getVNDateParts, 
    getLocalDateVN, 
    formatLabel, 
    getHourVN, 
    formatVNDCompact, 
    getVNPeriodRange, 
    formatDateFormatted,
    formatWeekLabel,
    formatMonthLabel,
    handleExportExcel as handleExportExcelUtil 
} from '../../../utils/dashboardUtils';

import DashboardShell from '../../../components/layout/DashboardShell';
import { useAuth } from '../../../context/AuthContext';

const formatSlotLocation = (slotData) => {
    if (!slotData) return '—';
    const parkingName = slotData.area?.floor?.parking?.name || '';
    const shortParking = parkingName.includes(' - ')
        ? parkingName.split(' - ').pop()
        : parkingName;
    const floorName = (slotData.area?.floor?.name || `Tầng ${slotData.area?.floor?.floor_number || 1}`).replace(/Floor/g, 'Tầng');
    
    if (shortParking) {
        return `${shortParking} / ${floorName}`;
    }
    return `${floorName}`;
};

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

    const location = useLocation();
    const navigate = useNavigate();

    // ── Sync URL to state ──
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/log-management/lost-card')) {
            setCurrentView('log-management');
            setActiveLogTab('Quẹt thẻ');
        } else if (path.includes('/log-management/casual-card')) {
            setCurrentView('log-management');
            setActiveLogTab('Thẻ lượt');
        } else if (path.includes('/log-management/month-card')) {
            setCurrentView('log-management');
            setActiveLogTab('Vé tháng');
        } else if (path.includes('/log-management/login-log')) {
            setCurrentView('log-management');
            setActiveLogTab('Đăng nhập');
        } else if (path.includes('/card-management/month-card') || path.endsWith('/month-card')) {
            setCurrentView('card-management');
            setActiveCardTab('Thẻ tháng');
        } else if (path.includes('/card-management/casual-card') || path.endsWith('/card')) {
            setCurrentView('card-management');
            setActiveCardTab('Thẻ lượt');
        } else if (path.includes('/adjust-prices')) {
            setCurrentView('adjust-prices');
        }
    }, [location.pathname]);

    const handleLogTabClick = (tabName) => {
        let path = '';
        if (tabName === 'Quẹt thẻ') path = '/login/dashboard/log-management/lost-card';
        if (tabName === 'Thẻ lượt') path = '/login/dashboard/log-management/casual-card';
        if (tabName === 'Vé tháng') path = '/login/dashboard/log-management/month-card';
        if (tabName === 'Đăng nhập') path = '/login/dashboard/log-management/login-log';
        navigate(path);
    };

    const handleCardTabClick = (tabName) => {
        let path = '';
        if (tabName === 'Thẻ lượt') path = '/login/dashboard/card-management/casual-card';
        if (tabName === 'Thẻ tháng') path = '/login/dashboard/card-management/month-card';
        navigate(path);
    };


    // ── KPI Time Filter (lifted from CasualCardLogPage) ───────────────────
    const [kpiTimeFilter, setKpiTimeFilter] = useState('day');
    const [kpiDate, setKpiDate] = useState(todayVN());
    const [kpiMonth, setKpiMonth] = useState(thisMonthVN());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [dashboardPeriod, setDashboardPeriod] = useState('day');
    const [selectedCustomDate, setSelectedCustomDate] = useState(todayVN());
    const [selectedCustomMonth, setSelectedCustomMonth] = useState(thisMonthVN());
    const [trafficChartData, setTrafficChartData] = useState([]);
    const [revenueChartData, setRevenueChartData] = useState([]);

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
    const [floorData, setFloorData] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [recentIn, setRecentIn] = useState([]);
    const [recentOut, setRecentOut] = useState([]);
    const [incidents, setIncidents] = useState([]);

    // ─── Load data từ Supabase ────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch real-time stats from backend
            const data = await fetchAllDashboardData();

            // 2. Resolve building ID for current user
            let targetBuildingId = null;
            if (computedRole !== 'ADMIN' && user?.id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('building_id')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profile?.building_id) {
                    targetBuildingId = profile.building_id;
                }
            }

            // 3. Define date ranges in VN timezone
            const { startDate, endDate } = getVNPeriodRange(dashboardPeriod, selectedCustomDate, selectedCustomMonth);

            // 4. Query parking sessions in the period
            let sessionsQuery = supabase
                .from('parking_sessions')
                .select('entry_time, exit_time, vehicle:vehicle_id(vehicle_type:vehicle_type_id(name))')
                .gte('entry_time', startDate)
                .lte('entry_time', endDate);

            if (targetBuildingId) {
                const { data: logs } = await supabase
                    .from('entry_exit_log')
                    .select('session_id')
                    .eq('building_id', targetBuildingId);
                const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];
                if (sessionIds.length > 0) {
                    sessionsQuery = sessionsQuery.in('session_id', sessionIds);
                } else {
                    sessionsQuery = sessionsQuery.in('session_id', ['none']);
                }
            }
            const { data: sessions } = await sessionsQuery;

            // 5. Query lost cards in the period
            let lostQuery = supabase
                .from('card_lost_log')
                .select('*', { count: 'exact', head: true })
                .gte('reported_at', startDate)
                .lte('reported_at', endDate);
            if (targetBuildingId) {
                lostQuery = lostQuery.eq('building_id', targetBuildingId);
            }
            const { count: lostCount } = await lostQuery;

            // 6. Query payments in the period
            let paymentsQuery = supabase
                .from('payment')
                .select('amount, payment_time, payment_type')
                .eq('status', 'Đã thanh toán')
                .gte('payment_time', startDate)
                .lte('payment_time', endDate);

            if (targetBuildingId) {
                const { data: logs } = await supabase
                    .from('entry_exit_log')
                    .select('session_id')
                    .eq('building_id', targetBuildingId);
                const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];
                if (sessionIds.length > 0) {
                    paymentsQuery = paymentsQuery.in('session_id', sessionIds);
                } else {
                    paymentsQuery = paymentsQuery.in('session_id', ['none']);
                }
            }
            const { data: payments } = await paymentsQuery;

            // 7. Calculate overall stats
            const periodTraffic = (sessions || []).length;
            const periodIncidents = lostCount || 0;
            const periodRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            // Compute second revenue metric (doanh thu tháng or average)
            let periodRevenue2 = 0;
            const selMonthStr = dashboardPeriod === 'month' 
                ? (selectedCustomMonth || thisMonthVN()) 
                : (selectedCustomDate || todayVN()).slice(0, 7);

            if (dashboardPeriod === 'day') {
                const monthRange = getVNPeriodRange('month', null, selMonthStr);
                let monthPaymentsQuery = supabase
                    .from('payment')
                    .select('amount')
                    .eq('status', 'Đã thanh toán')
                    .gte('payment_time', monthRange.startDate)
                    .lte('payment_time', monthRange.endDate);

                if (targetBuildingId) {
                    const { data: logs } = await supabase
                        .from('entry_exit_log')
                        .select('session_id')
                        .eq('building_id', targetBuildingId);
                    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];
                    if (sessionIds.length > 0) {
                        monthPaymentsQuery = monthPaymentsQuery.in('session_id', sessionIds);
                    } else {
                        monthPaymentsQuery = monthPaymentsQuery.in('session_id', ['none']);
                    }
                }
                const { data: monthPayments } = await monthPaymentsQuery;
                periodRevenue2 = (monthPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            } else if (dashboardPeriod === 'week') {
                periodRevenue2 = Math.round(periodRevenue / 7);
            } else if (dashboardPeriod === 'month') {
                const [y, m] = selMonthStr.split('-').map(Number);
                const daysInMonth = new Date(y, m, 0).getDate();
                periodRevenue2 = Math.round(periodRevenue / (daysInMonth || 30));
            }

            setStats({
                todayTraffic: periodTraffic,
                activeSessions: data.activeSessions,
                emptySlots: data.availableSlots,
                usedSlots: data.occupiedSlots,
                incidents: periodIncidents,
                revenueToday: periodRevenue,
                revenueMonth: periodRevenue2,
            });

            // 8. Generate traffic and revenue charts
            if (dashboardPeriod === 'day') {
                // Hourly traffic
                const hourlyTraffic = Array(24).fill(0);
                (sessions || []).forEach(s => {
                    const h = getHourVN(s.entry_time);
                    if (h >= 0 && h <= 23) hourlyTraffic[h]++;
                });
                setTrafficChartData(hourlyTraffic.map((val, idx) => ({
                    label: `${String(idx).padStart(2, '0')}h`,
                    val
                })));

                // Hourly revenue
                const hourlyRevenue = Array(24).fill(0);
                (payments || []).forEach(p => {
                    const h = getHourVN(p.payment_time);
                    if (h >= 0 && h <= 23) hourlyRevenue[h] += (Number(p.amount) || 0);
                });
                const maxRev = Math.max(...hourlyRevenue, 1);
                setRevenueChartData(hourlyRevenue.map((val, idx) => ({
                    label: `${String(idx).padStart(2, '0')}h`,
                    val,
                    peak: val === maxRev && val > 0
                })));
            } else {
                // Daily traffic & revenue for Week or Month
                const datesList = [];
                if (dashboardPeriod === 'week') {
                    const parts = (selectedCustomDate || todayVN()).split('-').map(Number);
                    const [y, m, d] = (parts.length === 3 && !parts.some(isNaN)) ? parts : [2026, 7, 27];
                    const dt = new Date(y, m - 1, d);
                    const currentDay = dt.getDay();
                    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
                    for (let i = 0; i < 7; i++) {
                        const dayMs = Date.UTC(y, m - 1, d + diffToMonday + i, 12, 0, 0);
                        const dayObj = new Date(dayMs);
                        const dy = dayObj.getUTCFullYear();
                        const dm = String(dayObj.getUTCMonth() + 1).padStart(2, '0');
                        const dd = String(dayObj.getUTCDate()).padStart(2, '0');
                        datesList.push(`${dy}-${dm}-${dd}`);
                    }
                } else if (dashboardPeriod === 'month') {
                    const parts = (selectedCustomMonth || thisMonthVN()).split('-').map(Number);
                    const [y, m] = (parts.length === 2 && !parts.some(isNaN)) ? parts : [2026, 7];
                    const daysInMonth = new Date(y, m, 0).getDate();
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dm = String(m).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        datesList.push(`${y}-${dm}-${dd}`);
                    }
                }

                // Daily traffic
                const dailyTraffic = {};
                datesList.forEach(d => { dailyTraffic[d] = 0; });
                (sessions || []).forEach(s => {
                    const dateStr = getLocalDateVN(s.entry_time);
                    if (dailyTraffic[dateStr] !== undefined) dailyTraffic[dateStr]++;
                });
                setTrafficChartData(datesList.map(d => ({
                    label: formatLabel(d),
                    labelFull: d,
                    val: dailyTraffic[d]
                })));

                // Daily revenue
                const dailyRevenue = {};
                datesList.forEach(d => { dailyRevenue[d] = 0; });
                (payments || []).forEach(p => {
                    const dateStr = getLocalDateVN(p.payment_time);
                    if (dailyRevenue[dateStr] !== undefined) dailyRevenue[dateStr] += (Number(p.amount) || 0);
                });
                const maxRev = Math.max(...Object.values(dailyRevenue), 1);
                setRevenueChartData(datesList.map(d => ({
                    label: formatLabel(d),
                    labelFull: d,
                    val: dailyRevenue[d],
                    peak: dailyRevenue[d] === maxRev && dailyRevenue[d] > 0
                })));
            }

            // 9. Vehicle distribution
            setVehicleTypes(data.vehicleTypeDistribution || []);

            setFloorData(data.floorOccupancy);
            // Fetch and resolve slot_code for recent check-ins and check-outs in the frontend
            const entryLogIds = (data.recentEntries || []).map(item => item.id).filter(Boolean);
            const exitLogIds = (data.recentExits || []).map(item => item.id).filter(Boolean);

            let entrySlotsMap = {};
            let exitSlotsMap = {};

            if (entryLogIds.length > 0) {
                try {
                    const { data: entryLogs } = await supabase
                        .from('entry_exit_log')
                        .select(`
                            log_id,
                            session:session_id (
                                slot:slot_id (
                                    slot_code,
                                    area:area_id (
                                        floor:floor_id (
                                            floor_number,
                                            name,
                                            parking:parking_id (
                                                name
                                            )
                                        )
                                    )
                                )
                            )
                        `)
                        .in('log_id', entryLogIds);
                    
                    (entryLogs || []).forEach(log => {
                        const slotObj = log.session?.slot;
                        if (slotObj) {
                            entrySlotsMap[log.log_id] = formatSlotLocation(slotObj);
                        }
                    });

                    const missingEntryIds = entryLogIds.filter(id => !entrySlotsMap[id]);
                    if (missingEntryIds.length > 0) {
                        const { data: entrySessions } = await supabase
                            .from('parking_sessions')
                            .select(`
                                session_id,
                                slot:slot_id (
                                    slot_code,
                                    area:area_id (
                                        floor:floor_id (
                                            floor_number,
                                            name,
                                            parking:parking_id (
                                                name
                                            )
                                        )
                                    )
                                )
                            `)
                            .in('session_id', missingEntryIds);
                        (entrySessions || []).forEach(sess => {
                            const slotObj = sess.slot;
                            if (slotObj) {
                                entrySlotsMap[sess.session_id] = formatSlotLocation(slotObj);
                            }
                        });
                    }
                } catch (e) {
                    console.error('[DashboardView] Error resolving entry slot codes:', e);
                }
            }

            if (exitLogIds.length > 0) {
                try {
                    const { data: exitLogs } = await supabase
                        .from('entry_exit_log')
                        .select(`
                            log_id,
                            session:session_id (
                                slot:slot_id (
                                    slot_code,
                                    area:area_id (
                                        floor:floor_id (
                                            floor_number,
                                            name,
                                            parking:parking_id (
                                                name
                                            )
                                        )
                                    )
                                )
                            )
                        `)
                        .in('log_id', exitLogIds);
                    
                    (exitLogs || []).forEach(log => {
                        const slotObj = log.session?.slot;
                        if (slotObj) {
                            exitSlotsMap[log.log_id] = formatSlotLocation(slotObj);
                        }
                    });

                    const missingExitIds = exitLogIds.filter(id => !exitSlotsMap[id]);
                    if (missingExitIds.length > 0) {
                        const { data: exitSessions } = await supabase
                            .from('parking_sessions')
                            .select(`
                                session_id,
                                slot:slot_id (
                                    slot_code,
                                    area:area_id (
                                        floor:floor_id (
                                            floor_number,
                                            name,
                                            parking:parking_id (
                                                name
                                            )
                                        )
                                    )
                                )
                            `)
                            .in('session_id', missingExitIds);
                        (exitSessions || []).forEach(sess => {
                            const slotObj = sess.slot;
                            if (slotObj) {
                                exitSlotsMap[sess.session_id] = formatSlotLocation(slotObj);
                            }
                        });
                    }
                } catch (e) {
                    console.error('[DashboardView] Error resolving exit slot codes:', e);
                }
            }

            const resolvedRecentIn = (data.recentEntries || []).map(item => ({
                ...item,
                slot: entrySlotsMap[item.id] || '—'
            }));

            const resolvedRecentOut = (data.recentExits || []).map(item => ({
                ...item,
                slot: exitSlotsMap[item.id] || '—'
            }));

            setRecentIn(resolvedRecentIn);
            setRecentOut(resolvedRecentOut);
            setIncidents(data.recentIncidents);
        } catch (err) {
            console.error('[DashboardView] loadData error:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [dashboardPeriod, selectedCustomDate, selectedCustomMonth]);

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

    const handleExportExcel = () => {
        handleExportExcelUtil({
            dashboardPeriod,
            dateFormatted,
            weekLabel,
            monthFormatted,
            stats,
            floorData,
            vehicleTypes,
            trafficChartData,
            revenueChartData,
            recentIn,
            recentOut,
            incidents,
            formatVND
        });
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

    const maxTrafficVal = Math.max(...trafficChartData.map(d => d.val), 1);
    const maxRevenueVal = Math.max(...revenueChartData.map(d => d.val), 1);

    // Compute date ranges labels for cards & descriptions
    const dateFormatted = formatDateFormatted(selectedCustomDate);
    const weekLabel = formatWeekLabel(selectedCustomDate);
    const monthFormatted = formatMonthLabel(selectedCustomMonth);

    return (
        <DashboardShell currentTab={currentView} onTabSelect={(tab) => {
            if (tab === 'card-management') {
                navigate('/login/dashboard/month-card');
            } else if (tab === 'adjust-prices') {
                navigate('/login/dashboard/adjust-prices');
            } else if (tab === 'manager-dashboard') {
                navigate('/login/dashboard');
            } else {
                setCurrentView(tab);
            }
        }}>

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
                        {renderTabButton('Thẻ lượt', activeCardTab === 'Thẻ lượt', () => handleCardTabClick('Thẻ lượt'))}
                        {renderTabButton('Thẻ tháng', activeCardTab === 'Thẻ tháng', () => handleCardTabClick('Thẻ tháng'))}
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
                            {renderTabButton('Nhật ký mất thẻ', activeLogTab === 'Quẹt thẻ', () => handleLogTabClick('Quẹt thẻ'))}
                            {renderTabButton('Nhật ký thẻ lượt', activeLogTab === 'Thẻ lượt', () => handleLogTabClick('Thẻ lượt'))}
                            {renderTabButton('Nhật ký thẻ tháng', activeLogTab === 'Vé tháng', () => handleLogTabClick('Vé tháng'))}
                            {renderTabButton('Nhật ký đăng nhập', activeLogTab === 'Đăng nhập', () => handleLogTabClick('Đăng nhập'))}
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
                    <div className="db-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h1 className="db-h1">Thống Kê Tổng Quan</h1>
                            <p className="db-sub">Số liệu vận hành trực tiếp, tình trạng lấp đầy và báo cáo hàng ngày</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                height: '42px',
                                boxSizing: 'border-box'
                            }}>
                                {/* Theo ngày */}
                                <button
                                    type="button"
                                    onClick={() => setDashboardPeriod('day')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0 16px',
                                        height: '100%',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: dashboardPeriod === 'day' ? '#ffffff' : 'transparent',
                                        color: dashboardPeriod === 'day' ? '#2563eb' : '#64748b',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: dashboardPeriod === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
                                    Theo ngày
                                </button>

                                {/* Theo tuần */}
                                <button
                                    type="button"
                                    onClick={() => setDashboardPeriod('week')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0 16px',
                                        height: '100%',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: dashboardPeriod === 'week' ? '#ffffff' : 'transparent',
                                        color: dashboardPeriod === 'week' ? '#2563eb' : '#64748b',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: dashboardPeriod === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>date_range</span>
                                    Theo tuần
                                </button>

                                {/* Theo tháng */}
                                <button
                                    type="button"
                                    onClick={() => setDashboardPeriod('month')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0 16px',
                                        height: '100%',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: dashboardPeriod === 'month' ? '#ffffff' : 'transparent',
                                        color: dashboardPeriod === 'month' ? '#2563eb' : '#64748b',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: dashboardPeriod === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s ease',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                                    Theo tháng
                                </button>
                            </div>

                            {dashboardPeriod === 'day' && (
                                <input
                                    type="date"
                                    value={selectedCustomDate}
                                    onChange={(e) => setSelectedCustomDate(e.target.value)}
                                    style={{
                                        padding: '0 10px',
                                        width: '150px',
                                        minWidth: '150px',
                                        maxWidth: '150px',
                                        borderRadius: '10px',
                                        border: '1.5px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        height: '42px',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                    }}
                                />
                            )}

                            {dashboardPeriod === 'week' && (
                                <input
                                    type="date"
                                    value={selectedCustomDate}
                                    onChange={(e) => setSelectedCustomDate(e.target.value)}
                                    style={{
                                        padding: '0 10px',
                                        width: '150px',
                                        minWidth: '150px',
                                        maxWidth: '150px',
                                        borderRadius: '10px',
                                        border: '1.5px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        height: '42px',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                    }}
                                />
                            )}

                            {dashboardPeriod === 'month' && (
                                <input
                                    type="month"
                                    value={selectedCustomMonth}
                                    onChange={(e) => setSelectedCustomMonth(e.target.value)}
                                    style={{
                                        padding: '0 10px',
                                        width: '150px',
                                        minWidth: '150px',
                                        maxWidth: '150px',
                                        borderRadius: '10px',
                                        border: '1.5px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        height: '42px',
                                        boxSizing: 'border-box',
                                        flexShrink: 0
                                    }}
                                />
                            )}

                            <button
                                type="button"
                                onClick={handleExportExcel}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0 16px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #10b981',
                                    backgroundColor: '#10b981',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s ease'
                                }}
                                className="db-export-excel-btn"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download_for_offline</span>
                                Xuất Excel
                            </button>

                            <button
                                type="button"
                                className={`custom-dashboard-refresh-btn ${isRefreshing ? 'db-refresh-btn--spinning' : ''}`}
                                onClick={handleRefresh}
                                disabled={isRefreshing || isLoading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0 16px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
                                {isRefreshing ? 'Đang cập nhật…' : 'Làm mới'}
                            </button>
                        </div>
                    </div>

                    {/* ── KPI Cards ── */}
                    <div className="db-kpis">
                        {/* Lượt xe ra/vào – Móc từ dữ liệu tổng hợp theo khoảng thời gian */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>
                                    {dashboardPeriod === 'day' ? `LƯỢT XE RA/VÀO NGÀY ${dateFormatted}` : 
                                     dashboardPeriod === 'week' ? `LƯỢT XE VÀO TUẦN ${weekLabel}` : 
                                     `LƯỢT XE VÀO THÁNG ${monthFormatted}`}
                                </span>
                                <span className="db-kpi-icon" style={{ color: '#3B82F6' }}>
                                    <span className="material-symbols-outlined">swap_vert</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.todayTraffic} lượt</div>
                            <div className="db-kpi-note">
                                {dashboardPeriod === 'day' ? 'Tổng lượt xe ra/vào trong ngày' : 
                                 dashboardPeriod === 'week' ? `Tổng lượt xe vào trong tuần ${weekLabel}` : 
                                 `Tổng lượt xe vào trong tháng ${monthFormatted}`}
                            </div>
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

                        {/* Sự cố – từ card_lost_log + incident_report */}
                        <div className="db-kpi">
                            <div className="db-kpi-head">
                                <span>
                                    {dashboardPeriod === 'day' ? `SỰ CỐ NGÀY ${dateFormatted}` : 
                                     dashboardPeriod === 'week' ? `SỰ CỐ TUẦN ${weekLabel}` : 
                                     `SỰ CỐ THÁNG ${monthFormatted}`}
                                </span>
                                <span className="db-kpi-icon" style={{ color: '#ef4444' }}>
                                    <span className="material-symbols-outlined">warning</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{stats.incidents} sự cố</div>
                            <div className="db-kpi-note">
                                {dashboardPeriod === 'day' ? `Các sự cố ghi nhận ngày ${dateFormatted}` : 
                                 dashboardPeriod === 'week' ? `Các sự cố ghi nhận trong tuần ${weekLabel}` : 
                                 `Các sự cố ghi nhận trong tháng ${monthFormatted}`}
                            </div>
                            <div className="db-kpi-status-cue" style={{ color: stats.incidents > 0 ? '#ef4444' : '#10b981' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{stats.incidents > 0 ? 'warning' : 'verified'}</span>
                                <span>{stats.incidents > 0 ? 'Cần kiểm tra ngay' : 'Hoạt động an toàn'}</span>
                            </div>
                        </div>

                        {/* Doanh thu 1 – từ payment.status = 'Đã trả' */}
                        <div className="db-kpi db-kpi--clickable" onClick={() => setIsTodayModalOpen(true)}>
                            <div className="db-kpi-head">
                                <span>
                                    {dashboardPeriod === 'day' ? `DOANH THU NGÀY ${dateFormatted}` : 
                                     dashboardPeriod === 'week' ? `DOANH THU TUẦN ${weekLabel}` : 
                                     `DOANH THU THÁNG ${monthFormatted}`}
                                </span>
                                <span className="db-kpi-icon" style={{ color: '#059669' }}>
                                    <span className="material-symbols-outlined">payments</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{formatVND(stats.revenueToday)}</div>
                            <div className="db-kpi-note">
                                {dashboardPeriod === 'day' ? 'Tiền mặt & QR ngân hàng đã thu' : 
                                 dashboardPeriod === 'week' ? `Tổng doanh thu trong tuần ${weekLabel}` : 
                                 `Tổng doanh thu trong tháng ${monthFormatted}`}
                            </div>
                            <div className="db-kpi-clickable-cue">
                                <span>Nhấn để xem chi tiết</span>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </div>
                        </div>

                        {/* Doanh thu 2 – từ payment.status = 'Đã trả' */}
                        <div className="db-kpi db-kpi--clickable" onClick={() => setIsMonthModalOpen(true)}>
                            <div className="db-kpi-head">
                                <span>
                                    {dashboardPeriod === 'day' ? `DOANH THU THÁNG ${monthFormatted}` : 'DOANH THU TB NGÀY'}
                                </span>
                                <span className="db-kpi-icon" style={{ color: '#1D4ED8' }}>
                                    <span className="material-symbols-outlined">trending_up</span>
                                </span>
                            </div>
                            <div className="db-kpi-value">{formatVND(stats.revenueMonth)}</div>
                            <div className="db-kpi-note">
                                {dashboardPeriod === 'day' ? `Tổng doanh thu tháng ${monthFormatted}` : 
                                 dashboardPeriod === 'week' ? 'Doanh thu trung bình mỗi ngày trong tuần' : 
                                 'Doanh thu trung bình mỗi ngày trong tháng'}
                            </div>
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
                                <div className="db-card-head-row">
                                    <div>
                                        <p className="db-card-title">
                                            {dashboardPeriod === 'day' ? 'Lượt xe theo giờ' : 'Lượt xe vào theo ngày'}
                                        </p>
                                        <p className="db-card-desc">
                                            {dashboardPeriod === 'day' ? `Phân bố lượt xe vào theo giờ ngày ${dateFormatted}` : `Phân bố lượt xe vào các ngày trong khoảng thời gian chọn`}
                                        </p>
                                    </div>
                                    <span className="db-chart-badge">
                                        {dashboardPeriod === 'day' ? 'Hôm nay' : dashboardPeriod === 'week' ? 'Tuần này' : 'Tháng này'}
                                    </span>
                                </div>
                            </div>
                            <div className="db-card-body">
                                <div className="db-traffic-chart">
                                    <div className="db-traffic-y-axis">
                                        <span>{Math.round(maxTrafficVal)}</span>
                                        <span>{Math.round(maxTrafficVal * 0.75)}</span>
                                        <span>{Math.round(maxTrafficVal * 0.5)}</span>
                                        <span>{Math.round(maxTrafficVal * 0.25)}</span>
                                        <span>0</span>
                                    </div>
                                    <div className="db-chart-container">
                                        <div className="db-chart-gridlines">
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                        </div>
                                        <div className="db-bar-chart">
                                            {trafficChartData.map((item, idx) => (
                                                <div className="db-bar-wrap" key={idx}>
                                                    <div
                                                        className="db-bar"
                                                        style={{ height: `${Math.max(5, (item.val / maxTrafficVal) * 100)}%` }}
                                                    >
                                                        <div className="db-tooltip">
                                                            <div className="db-tooltip-label">{item.labelFull || item.label}</div>
                                                            <div className="db-tooltip-val">{item.val} lượt</div>
                                                        </div>
                                                    </div>
                                                    <span className="db-x">
                                                        {trafficChartData.length <= 7 || idx % 5 === 0 || idx === trafficChartData.length - 1 ? item.label : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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
                                        <p className="db-card-desc">
                                            {dashboardPeriod === 'day' ? `Tổng thu tài chính theo giờ ngày ${dateFormatted}` : `Tổng thu tài chính theo các ngày trong khoảng thời gian chọn`}
                                        </p>
                                    </div>
                                    <span className="db-chart-badge badge-revenue">
                                        {dashboardPeriod === 'day' ? 'Hôm nay' : dashboardPeriod === 'week' ? 'Tuần này' : 'Tháng này'}
                                    </span>
                                </div>
                            </div>
                            <div className="db-card-body">
                                <div className="db-revenue-chart">
                                    <div className="db-rev-y-axis">
                                        <span>{formatVNDCompact(maxRevenueVal)}</span>
                                        <span>{formatVNDCompact(maxRevenueVal * 0.75)}</span>
                                        <span>{formatVNDCompact(maxRevenueVal * 0.5)}</span>
                                        <span>{formatVNDCompact(maxRevenueVal * 0.25)}</span>
                                        <span>0 ₫</span>
                                    </div>
                                    <div className="db-chart-container">
                                        <div className="db-chart-gridlines">
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                            <div className="db-gridline" />
                                        </div>
                                        <div className="db-rev-bars">
                                            {revenueChartData.map((b, idx) => (
                                                <div className="db-rev-bar-group" key={idx}>
                                                    <div
                                                        className={`db-rev-bar${b.peak ? ' db-rev-bar--peak' : ''}`}
                                                        style={{ height: `${Math.max(5, (b.val / maxRevenueVal) * 100)}%` }}
                                                    >
                                                        {b.peak && <div className="db-peak-dot" />}
                                                        <div className="db-tooltip">
                                                            <div className="db-tooltip-label">{b.labelFull || b.label}</div>
                                                            <div className="db-tooltip-val">{formatVND(b.val)}</div>
                                                        </div>
                                                    </div>
                                                    <span className="db-rev-label">
                                                        {revenueChartData.length <= 7 || idx % 5 === 0 || idx === revenueChartData.length - 1 ? b.label : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
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