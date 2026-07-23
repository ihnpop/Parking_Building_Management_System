import { useState, useEffect, useCallback } from 'react';
import supabase from '../../../config/supabaseClient';
import { formatVND } from '../../../service/dashboardApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Đầu ngày hôm nay (ISO) theo giờ máy chủ */
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

/** Cuối ngày hôm nay (ISO) */
function endOfToday() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
}

/** Đầu tháng hiện tại (ISO) */
function startOfCurrentMonth() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

/** Cuối tháng hiện tại (ISO) */
function endOfCurrentMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
}

/** Format thời gian HH:mm theo VN timezone */
function formatTimeVN(dateStr) {
    if (!dateStr) return '—';
    try {
        let val = dateStr.trim();
        if (val.includes(' ') && !val.includes('T')) val = val.replace(' ', 'T');
        if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) val = val + 'Z';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '—';
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
    } catch {
        return '—';
    }
}

/** Lấy giờ VN (0–23) từ date string */
function getHourVN(dateStr) {
    if (!dateStr) return -1;
    try {
        let val = dateStr.trim();
        if (val.includes(' ') && !val.includes('T')) val = val.replace(' ', 'T');
        if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) val = val + 'Z';
        const d = new Date(val);
        if (isNaN(d.getTime())) return -1;
        const h = parseInt(
            new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(d),
            10
        );
        return h === 24 ? 0 : h;
    } catch {
        return -1;
    }
}

const VEHICLE_COLOR_MAP = {
    'Xe máy': '#10B981',
    'Ô tô': '#EAB308',
};
const VEHICLE_COLOR_DEFAULT = '#FBBF24';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [buildingName, setBuildingName] = useState('');
    const [buildingId, setBuildingId] = useState(null);
    const [noBuildingAssigned, setNoBuildingAssigned] = useState(false);

    const [stats, setStats] = useState({
        availableSlots: 0,
        occupiedSlots: 0,
        totalSlots: 0,
        activeSessions: 0,
        todayTraffic: 0,
        revenueToday: 0,
        revenueMonth: 0,
    });

    const [hourlyData, setHourlyData] = useState(Array(24).fill(0));
    const [floorData, setFloorData] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [warningFloors, setWarningFloors] = useState([]);
    const [recentEntries, setRecentEntries] = useState([]);
    const [recentExits, setRecentExits] = useState([]);

    // ── Step 1: Lấy building_id của Manager đang đăng nhập từ profiles ──
    const fetchBuildingId = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('building_id, building:building_id(name)')
                .eq('id', user.id)
                .single();

            if (error || !profile) return null;

            if (!profile.building_id) {
                setNoBuildingAssigned(true);
                return null;
            }

            setBuildingName(profile.building?.name || '');
            setBuildingId(profile.building_id);
            return profile.building_id;
        } catch (err) {
            console.error('[ManagerDashboard] fetchBuildingId error:', err);
            return null;
        }
    }, []);

    // ── Step 2: Load dashboard data theo building_id ──
    const loadData = useCallback(async (bldId) => {
        if (!bldId) return;
        setIsLoading(true);
        try {
            const startToday = startOfToday();
            const endToday = endOfToday();
            const startMonth = startOfCurrentMonth();
            const endMonth = endOfCurrentMonth();

            // 1. Lấy tất cả parking_id thuộc building này
            const { data: parkings } = await supabase
                .from('parking')
                .select('parking_id')
                .eq('building_id', bldId)
                .eq('status', 'Hoạt động');

            const parkingIds = (parkings || []).map(p => p.parking_id);

            // 2. Lấy tất cả floor_id thuộc các parkings này
            const { data: floors } = parkingIds.length > 0
                ? await supabase
                    .from('floor')
                    .select('floor_id')
                    .in('parking_id', parkingIds)
                : { data: [] };

            const floorIds = (floors || []).map(f => f.floor_id);

            // 3. Lấy tất cả area_id thuộc các floors này
            const { data: areas } = floorIds.length > 0
                ? await supabase
                    .from('area')
                    .select('area_id')
                    .in('floor_id', floorIds)
                : { data: [] };

            const areaIds = (areas || []).map(a => a.area_id);

            // 4. Lấy slots với status theo building
            const { data: slots } = areaIds.length > 0
                ? await supabase
                    .from('slot')
                    .select('slot_id, status, area_id')
                    .in('area_id', areaIds)
                : { data: [] };

            const availableSlots = (slots || []).filter(s => s.status === 'Sẵn sàng').length;
            let occupiedSlots = (slots || []).filter(s => s.status === 'Đang sử dụng').length;
            const totalSlots = (slots || []).length;

            // 5. Lấy active parking_sessions thuộc building (qua entry_exit_log của building)
            const { data: allBuildingLogs } = await supabase
                .from('entry_exit_log')
                .select('session_id')
                .eq('building_id', bldId)
                .eq('direction', 'Xe vào');

            const buildingSessionIds = [...new Set((allBuildingLogs || []).map(l => l.session_id).filter(Boolean))];

            let activeSessions = 0;
            let activeSessionsData = [];

            if (buildingSessionIds.length > 0) {
                const { data: activeSess } = await supabase
                    .from('parking_sessions')
                    .select('session_id, slot_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(name))')
                    .eq('status', 'Đang gửi xe')
                    .in('session_id', buildingSessionIds);

                activeSessionsData = activeSess || [];
                activeSessions = activeSessionsData.length;
            }

            // Fallback nếu slot.status trong DB chưa cập nhật 'Đang sử dụng':
            if (occupiedSlots === 0) {
                occupiedSlots = activeSessions;
            }

            // 6. Lưu lượng theo giờ hôm nay (qua entry_exit_log.building_id)
            const { data: hourlyLogs } = await supabase
                .from('entry_exit_log')
                .select('event_time')
                .eq('building_id', bldId)
                .eq('direction', 'Xe vào')
                .gte('event_time', startToday)
                .lte('event_time', endToday);

            const hourlyArr = Array(24).fill(0);
            (hourlyLogs || []).forEach(row => {
                const h = getHourVN(row.event_time);
                if (h >= 0 && h <= 23) hourlyArr[h]++;
            });
            const todayTraffic = hourlyArr.reduce((s, v) => s + v, 0);

            // 7. Doanh thu hôm nay theo building (qua entry_exit_log.building_id → session_id → payment)
            const { data: todayLogs } = await supabase
                .from('entry_exit_log')
                .select('session_id')
                .eq('building_id', bldId)
                .gte('event_time', startToday)
                .lte('event_time', endToday);

            const todaySessionIds = [...new Set((todayLogs || []).map(l => l.session_id).filter(Boolean))];

            const { data: todayPayments } = await supabase
                .from('payment')
                .select('amount, session_id, payment_time')
                .eq('status', 'Đã thanh toán')
                .gte('payment_time', startToday)
                .lte('payment_time', endToday);

            const todayRevenue = (todayPayments || [])
                .filter(p => !p.session_id || todaySessionIds.includes(p.session_id))
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            // 8. Doanh thu tháng theo building
            const { data: monthLogs } = await supabase
                .from('entry_exit_log')
                .select('session_id')
                .eq('building_id', bldId)
                .gte('event_time', startMonth)
                .lte('event_time', endMonth);

            const monthSessionIds = [...new Set((monthLogs || []).map(l => l.session_id).filter(Boolean))];

            const { data: monthPayments } = await supabase
                .from('payment')
                .select('amount, session_id')
                .eq('status', 'Đã thanh toán')
                .gte('payment_time', startMonth)
                .lte('payment_time', endMonth);

            const revenueMonth = (monthPayments || [])
                .filter(p => !p.session_id || monthSessionIds.includes(p.session_id))
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            setStats({
                availableSlots,
                occupiedSlots,
                totalSlots,
                activeSessions,
                todayTraffic,
                revenueToday: todayRevenue,
                revenueMonth,
            });

            setHourlyData(hourlyArr);

            // 9. Tỷ lệ lấp đầy theo tầng (chỉ các tầng thuộc building này)
            const { data: floorDetail } = floorIds.length > 0
                ? await supabase
                    .from('floor')
                    .select(`
                        floor_id,
                        floor_number,
                        name,
                        parking:parking_id(name)
                    `)
                    .in('floor_id', floorIds)
                : { data: [] };

            const floorMap = new Map();
            (floorDetail || []).forEach(f => {
                const parkingName = f.parking?.name || '';
                const shortParking = parkingName.includes(' - ')
                    ? parkingName.split(' - ').pop()
                    : parkingName;
                const label = shortParking
                    ? `${shortParking} / ${f.name || `Tầng ${f.floor_number}`}`
                    : (f.name || `Tầng ${f.floor_number}`);
                floorMap.set(f.floor_id, {
                    floorId: f.floor_id,
                    floorName: label,
                    totalSlots: 0,
                    occupiedSlots: 0,
                });
            });

            const areaToFloor = {};
            const { data: areasWithFloor } = areaIds.length > 0
                ? await supabase
                    .from('area')
                    .select('area_id, floor_id')
                    .in('area_id', areaIds)
                : { data: [] };

            (areasWithFloor || []).forEach(a => { areaToFloor[a.area_id] = a.floor_id; });

            (slots || []).forEach(slot => {
                const floorId = areaToFloor[slot.area_id];
                if (!floorId || !floorMap.has(floorId)) return;
                const entry = floorMap.get(floorId);
                entry.totalSlots++;
                if (slot.status === 'Đang sử dụng') entry.occupiedSlots++;
            });

            const floorResult = [...floorMap.values()]
                .map(f => ({
                    ...f,
                    percentage: f.totalSlots > 0 ? Math.round((f.occupiedSlots / f.totalSlots) * 100) : 0,
                }))
                .sort((a, b) => b.totalSlots - a.totalSlots)
                .slice(0, 8);

            setFloorData(floorResult);
            setWarningFloors(floorResult.filter(f => f.percentage >= 80));

            // 10. Phân loại phương tiện đang trong bãi (thuộc building)
            const typeCount = {};
            (activeSessionsData || []).forEach(row => {
                const name = row.vehicle?.vehicle_type?.name;
                if (!name) return;
                typeCount[name] = (typeCount[name] || 0) + 1;
            });
            const vTotal = Object.values(typeCount).reduce((s, v) => s + v, 0);
            const vehicleResult = Object.entries(typeCount).map(([vehicleTypeName, count]) => ({
                vehicleTypeName,
                count,
                percentage: vTotal > 0 ? Math.round((count / vTotal) * 100) : 0,
                color: VEHICLE_COLOR_MAP[vehicleTypeName] ?? VEHICLE_COLOR_DEFAULT,
            }));
            setVehicleTypes(vehicleResult);

            // 11. Xe vào gần đây thuộc building
            const { data: recentIn } = await supabase
                .from('entry_exit_log')
                .select('log_id, plate_number, event_time')
                .eq('building_id', bldId)
                .eq('direction', 'Xe vào')
                .order('event_time', { ascending: false })
                .limit(5);

            setRecentEntries((recentIn || []).map(r => ({
                id: r.log_id,
                plate: r.plate_number || '—',
                slot: '—',
                time: formatTimeVN(r.event_time),
            })));

            // 12. Xe ra gần đây thuộc building
            const { data: recentOut } = await supabase
                .from('entry_exit_log')
                .select('log_id, plate_number, event_time')
                .eq('building_id', bldId)
                .eq('direction', 'Xe ra')
                .order('event_time', { ascending: false })
                .limit(5);

            setRecentExits((recentOut || []).map(r => ({
                id: r.log_id,
                plate: r.plate_number || '—',
                slot: '—',
                time: formatTimeVN(r.event_time),
            })));

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[ManagerDashboard] loadData error:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // ── Init ──
    useEffect(() => {
        let mounted = true;
        (async () => {
            const bldId = await fetchBuildingId();
            if (mounted && bldId) {
                await loadData(bldId);
            }
        })();
        return () => { mounted = false; };
    }, [fetchBuildingId, loadData]);

    const handleRefresh = () => {
        if (!buildingId) return;
        setIsRefreshing(true);
        loadData(buildingId);
    };

    const fillRate = stats.totalSlots > 0
        ? Math.round((stats.occupiedSlots / stats.totalSlots) * 100)
        : 0;

    const maxHourly = Math.max(...hourlyData, 1);

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // ── No building assigned state ──
    if (noBuildingAssigned) {
        return (
            <div className="mgr-page">
                <div className="mgr-no-building">
                    <span className="material-symbols-outlined mgr-no-building-icon">location_off</span>
                    <h2 className="mgr-no-building-title">Chưa được phân công tòa nhà</h2>
                    <p className="mgr-no-building-desc">
                        Tài khoản của bạn chưa được gán quản lý tòa nhà nào.<br />
                        Vui lòng liên hệ Admin để được phân công.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mgr-page">

            {/* ── Header ── */}
            <div className="mgr-header">
                <div className="mgr-header-left">
                    <h1 className="mgr-h1">

                        {buildingName && (
                            <span className="mgr-building-tag">
                                <span className="material-symbols-outlined">apartment</span>
                                {buildingName}
                            </span>
                        )}
                    </h1>

                </div>
                <button
                    type="button"
                    className={`mgr-refresh-btn${isRefreshing ? ' mgr-refresh-btn--spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoading}
                >
                    <span className="material-symbols-outlined">refresh</span>
                    {isRefreshing ? 'Đang cập nhật…' : 'Làm mới'}
                </button>
            </div>

            {/* ── Cảnh báo khu vực gần đầy ── */}
            {warningFloors.length > 0 && (
                <div className="mgr-alert-bar">
                    <span className="material-symbols-outlined mgr-alert-icon">warning</span>
                    <strong>Cảnh báo:&nbsp;</strong>
                    {warningFloors.map((f, i) => (
                        <span key={f.floorId}>
                            {i > 0 && ', '}
                            <strong>{f.floorName}</strong> lấp đầy {f.percentage}%
                        </span>
                    ))}
                </div>
            )}

            {/* ── KPI Row 1: Tình trạng chỗ đỗ ── */}
            <div className="mgr-section-label">
                <span className="material-symbols-outlined">local_parking</span>
                Tình trạng chỗ đỗ xe
            </div>
            <div className="mgr-kpis">

                <div className="mgr-kpi mgr-kpi--green">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">CHỖ CÒN TRỐNG</div>
                        <div className="mgr-kpi-value">{stats.availableSlots.toLocaleString('vi-VN')}</div>
                        <div className="mgr-kpi-unit">chỗ khả dụng</div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--blue">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">event_seat</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">ĐANG SỬ DỤNG</div>
                        <div className="mgr-kpi-value">{stats.occupiedSlots.toLocaleString('vi-VN')}</div>
                        <div className="mgr-kpi-unit">chỗ đã lấp</div>
                    </div>
                </div>

                <div className={`mgr-kpi ${fillRate >= 80 ? 'mgr-kpi--red' : fillRate >= 50 ? 'mgr-kpi--amber' : 'mgr-kpi--teal'}`}>
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">donut_large</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">TỶ LỆ LẤP ĐẦY</div>
                        <div className="mgr-kpi-value">{fillRate}%</div>
                        <div className="mgr-kpi-unit">
                            {fillRate >= 80 ? 'Gần đầy' : fillRate >= 50 ? 'Trung bình' : 'Còn nhiều chỗ'}
                        </div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--indigo">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">directions_car</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">XE ĐANG GỬI</div>
                        <div className="mgr-kpi-value">{stats.activeSessions.toLocaleString('vi-VN')}</div>
                        <div className="mgr-kpi-unit">phiên đang hoạt động</div>
                    </div>
                </div>

            </div>

            {/* ── KPI Row 2: Lưu lượng & Doanh thu ── */}
            <div className="mgr-section-label">
                <span className="material-symbols-outlined">analytics</span>
                Lưu lượng &amp; Doanh thu
            </div>
            <div className="mgr-kpis mgr-kpis--3col">

                <div className="mgr-kpi mgr-kpi--violet">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">swap_vert</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">LƯỢT XE HÔM NAY</div>
                        <div className="mgr-kpi-value">{stats.todayTraffic.toLocaleString('vi-VN')}</div>
                        <div className="mgr-kpi-unit">lượt ra/vào trong ngày</div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--emerald">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">DOANH THU HÔM NAY</div>
                        <div className="mgr-kpi-value mgr-kpi-value--sm">{formatVND(stats.revenueToday)}</div>
                        <div className="mgr-kpi-unit">tiền mặt &amp; QR đã thu</div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--sky">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">DOANH THU THÁNG</div>
                        <div className="mgr-kpi-value mgr-kpi-value--sm">{formatVND(stats.revenueMonth)}</div>
                        <div className="mgr-kpi-unit">tổng thu tháng hiện tại</div>
                    </div>
                </div>

            </div>

            {/* ── Charts Grid ── */}
            <div className="mgr-grid2">

                {/* Biểu đồ lượt xe theo giờ */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon">bar_chart</span>
                            <div>
                                <p className="mgr-card-title">Lượt xe theo giờ</p>
                                <p className="mgr-card-desc">Phân bố lưu lượng xe ra/vào hôm nay tại tòa nhà</p>
                            </div>
                        </div>
                    </div>
                    <div className="mgr-card-body">
                        {isLoading ? (
                            <div className="mgr-loading">Đang tải...</div>
                        ) : (
                            <div className="mgr-bar-chart">
                                {hourlyData.map((val, idx) => (
                                    <div className="mgr-bar-wrap" key={idx}>
                                        <div
                                            className={`mgr-bar${val > 0 && val === Math.max(...hourlyData) ? ' mgr-bar--peak' : ''}`}
                                            style={{ height: `${Math.max(4, (val / maxHourly) * 100)}%` }}
                                            title={`${String(idx).padStart(2, '0')}:00 — ${val} lượt`}
                                        />
                                        <span className="mgr-bar-x">{String(idx).padStart(2, '0')}h</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tỷ lệ lấp đầy theo tầng */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon">stacked_bar_chart</span>
                            <div>
                                <p className="mgr-card-title">Tỷ lệ lấp đầy theo tầng</p>
                                <p className="mgr-card-desc">Mức sử dụng công suất từng tầng trong tòa nhà</p>
                            </div>
                        </div>
                    </div>
                    <div className="mgr-card-body">
                        {isLoading ? (
                            <div className="mgr-loading">Đang tải...</div>
                        ) : floorData.length === 0 ? (
                            <div className="mgr-empty">Chưa có dữ liệu tầng.</div>
                        ) : (
                            <div className="mgr-floor-list">
                                {floorData.map((floor) => {
                                    const pct = floor.percentage || 0;
                                    const barClass = pct >= 80 ? 'mgr-floor-fill--danger'
                                        : pct >= 50 ? 'mgr-floor-fill--warn'
                                            : 'mgr-floor-fill--ok';
                                    return (
                                        <div className="mgr-floor-item" key={floor.floorId}>
                                            <div className="mgr-floor-info">
                                                <span className="mgr-floor-name">{floor.floorName}</span>
                                                <div className="mgr-floor-stats">
                                                    <span className={`mgr-floor-pct ${pct >= 80 ? 'mgr-floor-pct--danger' : pct >= 50 ? 'mgr-floor-pct--warn' : 'mgr-floor-pct--ok'}`}>
                                                        {pct}%
                                                    </span>
                                                    <span className="mgr-floor-count">{floor.occupiedSlots}/{floor.totalSlots} chỗ</span>
                                                </div>
                                            </div>
                                            <div className="mgr-floor-track">
                                                <div className={`mgr-floor-fill ${barClass}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ── Bottom Row ── */}
            <div className="mgr-grid3">

                {/* Phân loại phương tiện */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon">category</span>
                            <div>
                                <p className="mgr-card-title">Phân loại phương tiện</p>
                                <p className="mgr-card-desc">Tỷ lệ các loại xe đang trong bãi</p>
                            </div>
                        </div>
                    </div>
                    <div className="mgr-card-body">
                        {vehicleTypes.length === 0 ? (
                            <div className="mgr-empty">Không có xe nào trong bãi.</div>
                        ) : (
                            <>
                                <div className="mgr-vehicle-stack">
                                    {vehicleTypes.map((v) => (
                                        <div
                                            key={v.vehicleTypeName}
                                            className="mgr-vehicle-seg"
                                            style={{ width: `${v.percentage}%`, background: v.color }}
                                            title={`${v.vehicleTypeName}: ${v.count} xe (${v.percentage}%)`}
                                        />
                                    ))}
                                </div>
                                <div className="mgr-vehicle-legend">
                                    {vehicleTypes.map((v) => (
                                        <div className="mgr-vehicle-item" key={v.vehicleTypeName}>
                                            <span className="mgr-vehicle-dot" style={{ background: v.color }} />
                                            <span className="mgr-vehicle-name">{v.vehicleTypeName}</span>
                                            <span className="mgr-vehicle-count">{v.count} xe</span>
                                            <span className="mgr-vehicle-pct">{v.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Xe vào gần đây */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon mgr-icon--green">login</span>
                            <div>
                                <p className="mgr-card-title">Xe vào gần đây</p>
                                <p className="mgr-card-desc">Lượt xe mới vào tòa nhà</p>
                            </div>
                        </div>
                    </div>
                    {recentEntries.length === 0 ? (
                        <div className="mgr-empty">Chưa có dữ liệu xe vào.</div>
                    ) : (
                        <table className="mgr-table">
                            <thead>
                                <tr>
                                    <th>BIỂN SỐ</th>
                                    <th>VỊ TRÍ</th>
                                    <th>GIỜ VÀO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEntries.map((row) => (
                                    <tr key={row.id}>
                                        <td className="mgr-td-plate">{row.plate}</td>
                                        <td className="mgr-td-muted">{row.slot}</td>
                                        <td className="mgr-td-time">
                                            <span className="material-symbols-outlined mgr-td-clock">schedule</span>
                                            {' '}{row.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Xe ra gần đây */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon mgr-icon--amber">logout</span>
                            <div>
                                <p className="mgr-card-title">Xe ra gần đây</p>
                                <p className="mgr-card-desc">Lượt xe đã rời tòa nhà</p>
                            </div>
                        </div>
                    </div>
                    {recentExits.length === 0 ? (
                        <div className="mgr-empty">Chưa có dữ liệu xe ra.</div>
                    ) : (
                        <table className="mgr-table">
                            <thead>
                                <tr>
                                    <th>BIỂN SỐ</th>
                                    <th>VỊ TRÍ</th>
                                    <th>GIỜ RA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentExits.map((row) => (
                                    <tr key={row.id}>
                                        <td className="mgr-td-plate">{row.plate}</td>
                                        <td className="mgr-td-muted">{row.slot}</td>
                                        <td className="mgr-td-time">
                                            <span className="material-symbols-outlined mgr-td-clock">schedule</span>
                                            {' '}{row.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
}
