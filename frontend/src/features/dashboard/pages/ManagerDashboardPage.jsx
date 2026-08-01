import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../config/supabaseClient';
import { formatVND } from '../../../service/dashboardApi';
import {
    todayVN,
    thisMonthVN,
    getVNDateParts,
    getLocalDateVN,
    formatLabel,
    getHourVN,
    getVNPeriodRange,
    formatDateFormatted,
    formatWeekLabel,
    formatMonthLabel,
    handleExportExcel as handleExportExcelUtil
} from '../../../utils/dashboardUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const VEHICLE_COLOR_MAP = {
    'Xe máy': '#10B981',
    'Ô tô': '#EAB308',
};
const VEHICLE_COLOR_DEFAULT = '#FBBF24';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
    const { user: authUser } = useAuth();
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
        emptySlots: 0,
        usedSlots: 0,
        incidents: 0,
    });

    const [dashboardPeriod, setDashboardPeriod] = useState('day');
    const [selectedCustomDate, setSelectedCustomDate] = useState(todayVN());
    const [selectedCustomMonth, setSelectedCustomMonth] = useState(thisMonthVN());

    const [trafficChartData, setTrafficChartData] = useState([]);
    const [revenueChartData, setRevenueChartData] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [floorData, setFloorData] = useState([]);
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [warningFloors, setWarningFloors] = useState([]);
    const [recentEntries, setRecentEntries] = useState([]);
    const [recentExits, setRecentExits] = useState([]);

    // Compute formatted labels for Excel export and titles
    const dateFormatted = formatDateFormatted(selectedCustomDate);
    const weekLabel = formatWeekLabel(selectedCustomDate);
    const monthFormatted = formatMonthLabel(selectedCustomMonth);

    // ── Step 1: Lấy building_id của Manager đang đăng nhập từ profiles ──
    const fetchBuildingId = useCallback(async () => {
        try {
            // Thử lấy user từ Supabase session trước
            let userId = null;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.id) userId = user.id;
            } catch (_) { /* ignore */ }

            // Fallback: dùng AuthContext user hoặc localStorage khi token hết hạn
            if (!userId) {
                const ctxId = authUser?.id;
                const lsId = localStorage.getItem('userId');
                userId = ctxId || lsId || null;
            }

            if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
                // Thử lại bằng session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    userId = session.user.id;
                } else {
                    console.warn('[ManagerDashboard] Không tìm thấy user ID hợp lệ');
                    return null;
                }
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('building_id, building:building_id(name)')
                .eq('id', userId)
                .single();

            if (error || !profile) {
                console.warn('[ManagerDashboard] Không tìm thấy profile:', error?.message);
                return null;
            }

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
    }, [authUser]);

    // ── Step 2: Load dashboard data theo building_id ──
    const loadData = useCallback(async (bldId) => {
        if (!bldId) return;
        setIsLoading(true);
        try {
            // Define date ranges in VN timezone
            const { startDate, endDate } = getVNPeriodRange(dashboardPeriod, selectedCustomDate, selectedCustomMonth);

            // Fetch current month boundaries for daily/monthly fallback
            const vnNow = new Date().getTime() + 7 * 60 * 60 * 1000;
            const vnDateNow = new Date(vnNow);
            const startMonth = new Date(Date.UTC(vnDateNow.getUTCFullYear(), vnDateNow.getUTCMonth(), 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000).toISOString();
            const endMonth = new Date(Date.UTC(vnDateNow.getUTCFullYear(), vnDateNow.getUTCMonth() + 1, 0, 23, 59, 59, 999) - 7 * 60 * 60 * 1000).toISOString();

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
                .select('session_id, vehicle_type:vehicle_type_id(name)')
                .eq('building_id', bldId)
                .eq('direction', 'Xe vào');

            const sessionTypeMap = {};
            (allBuildingLogs || []).forEach(l => {
                if (l.session_id && l.vehicle_type?.name) {
                    sessionTypeMap[l.session_id] = l.vehicle_type.name;
                }
            });

            const buildingSessionIds = [...new Set((allBuildingLogs || []).map(l => l.session_id).filter(Boolean))];

            let activeSessions = 0;
            let activeSessionsData = [];

            if (buildingSessionIds.length > 0) {
                const { data: activeSess } = await supabase
                    .from('parking_sessions')
                    .select('session_id, slot_id, plate_number, vehicle:vehicle_id(vehicle_type:vehicle_type_id(name))')
                    .eq('status', 'Đang gửi xe')
                    .in('session_id', buildingSessionIds);

                activeSessionsData = (activeSess || []).map(s => ({
                    ...s,
                    resolvedTypeName: s.vehicle?.vehicle_type?.name || sessionTypeMap[s.session_id] || null
                }));
                activeSessions = activeSessionsData.length;
            }

            if (occupiedSlots === 0) {
                occupiedSlots = activeSessions;
            }

            // 6. Query entry logs in the period
            const { data: periodLogs } = await supabase
                .from('entry_exit_log')
                .select('event_time, session_id')
                .eq('building_id', bldId)
                .eq('direction', 'Xe vào')
                .gte('event_time', startDate)
                .lte('event_time', endDate);

            const periodTraffic = (periodLogs || []).length;

            // 7. Query payments in the period for the building
            let periodPayments = [];
            if (buildingSessionIds.length > 0) {
                const { data: payments } = await supabase
                    .from('payment')
                    .select('amount, payment_time, session_id')
                    .eq('status', 'Đã thanh toán')
                    .gte('payment_time', startDate)
                    .lte('payment_time', endDate)
                    .in('session_id', buildingSessionIds);
                periodPayments = payments || [];
            } else {
                const { data: payments } = await supabase
                    .from('payment')
                    .select('amount, payment_time, session_id')
                    .eq('status', 'Đã thanh toán')
                    .gte('payment_time', startDate)
                    .lte('payment_time', endDate);
                periodPayments = payments || [];
            }

            // Tính tổng doanh thu trong kỳ từ periodPayments
            const periodRevenue = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            // Compute second revenue metric (monthly or average)
            const selMonthStr = dashboardPeriod === 'month' 
                ? (selectedCustomMonth || thisMonthVN()) 
                : (selectedCustomDate || todayVN()).slice(0, 7);

            let periodRevenue2 = 0;
            if (dashboardPeriod === 'day') {
                const monthRange = getVNPeriodRange('month', null, selMonthStr);
                let targetMonthRevenue = 0;
                if (buildingSessionIds.length > 0) {
                    const { data: mPayments } = await supabase
                        .from('payment')
                        .select('amount')
                        .eq('status', 'Đã thanh toán')
                        .gte('payment_time', monthRange.startDate)
                        .lte('payment_time', monthRange.endDate)
                        .in('session_id', buildingSessionIds);
                    targetMonthRevenue = (mPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                } else {
                    const { data: mPayments } = await supabase
                        .from('payment')
                        .select('amount')
                        .eq('status', 'Đã thanh toán')
                        .gte('payment_time', monthRange.startDate)
                        .lte('payment_time', monthRange.endDate);
                    targetMonthRevenue = (mPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                }
                periodRevenue2 = targetMonthRevenue;
            } else if (dashboardPeriod === 'week') {
                periodRevenue2 = Math.round(periodRevenue / 7);
            } else if (dashboardPeriod === 'month') {
                const [y, m] = selMonthStr.split('-').map(Number);
                const daysInMonth = new Date(y, m, 0).getDate();
                periodRevenue2 = Math.round(periodRevenue / (daysInMonth || 30));
            }

            // Query incidents count for the period
            let incidentCount = 0;
            try {
                const { count } = await supabase
                    .from('card_lost_log')
                    .select('*', { count: 'exact', head: true })
                    .eq('building_id', bldId)
                    .gte('reported_at', startDate)
                    .lte('reported_at', endDate);
                incidentCount = count || 0;
            } catch (e) {
                console.error('[ManagerDashboard] Error counting incidents:', e);
            }

            setStats({
                availableSlots,
                occupiedSlots,
                totalSlots,
                activeSessions,
                todayTraffic: periodTraffic,
                revenueToday: periodRevenue,
                revenueMonth: periodRevenue2,
                emptySlots: availableSlots,
                usedSlots: occupiedSlots,
                incidents: incidentCount,
            });

            // 8. Generate traffic and revenue charts
            if (dashboardPeriod === 'day') {
                const hourlyTraffic = Array(24).fill(0);
                (periodLogs || []).forEach(row => {
                    const h = getHourVN(row.event_time);
                    if (h >= 0 && h <= 23) hourlyTraffic[h]++;
                });
                setTrafficChartData(hourlyTraffic.map((val, idx) => ({
                    label: `${String(idx).padStart(2, '0')}h`,
                    val
                })));

                const hourlyRevenue = Array(24).fill(0);
                periodPayments.forEach(p => {
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
                (periodLogs || []).forEach(s => {
                    const dateStr = getLocalDateVN(s.event_time);
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
                periodPayments.forEach(p => {
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

            // 9. Tỷ lệ lấp đầy theo tầng
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
            });

            let motorbikeCount = 0;
            let carCount = 0;
            (activeSessionsData || []).forEach(row => {
                const name = row.resolvedTypeName || row.vehicle?.vehicle_type?.name || '';
                const lower = name.toLowerCase();
                const plate = (row.plate_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

                if (lower.includes('ô tô') || lower.includes('o to') || lower.includes('oto') || lower.includes('car') || lower.includes('4 bánh') || lower.includes('4 chỗ') || lower.includes('7 chỗ')) {
                    carCount++;
                } else if (lower.includes('máy') || lower.includes('may') || lower.includes('motorbike') || lower.includes('2 bánh') || lower.includes('moped')) {
                    motorbikeCount++;
                } else {
                    if (/^\d{2}[A-Z]\d{4,5}$/.test(plate) || plate.startsWith('30K') || plate.startsWith('36A') || plate.startsWith('30A') || plate.startsWith('51K') || plate.startsWith('51A') || plate.startsWith('29A')) {
                        carCount++;
                    } else {
                        motorbikeCount++;
                    }
                }
            });

            [...floorMap.values()].forEach(floor => {
                const fName = (floor.floorName || '').toLowerCase();
                if (fName.includes('floor 1') || fName.includes('tầng 1')) {
                    floor.occupiedSlots = Math.min(motorbikeCount, floor.totalSlots);
                } else if (fName.includes('floor 2') || fName.includes('tầng 2')) {
                    floor.occupiedSlots = Math.min(carCount, floor.totalSlots);
                } else {
                    floor.occupiedSlots = Math.min(motorbikeCount, floor.totalSlots);
                }
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

            // 10. Phân loại phương tiện đang trong bãi
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

            // 12. Xe ra gần đây thuộc building
            const { data: recentOut } = await supabase
                .from('entry_exit_log')
                .select('log_id, plate_number, event_time')
                .eq('building_id', bldId)
                .eq('direction', 'Xe ra')
                .order('event_time', { ascending: false })
                .limit(5);

            // Fetch and resolve slot_code for recent entries/exits
            const entryLogIds = (recentIn || []).map(item => item.log_id).filter(Boolean);
            const exitLogIds = (recentOut || []).map(item => item.log_id).filter(Boolean);

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
                    console.error('[ManagerDashboard] Error resolving entry slot codes:', e);
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
                    console.error('[ManagerDashboard] Error resolving exit slot codes:', e);
                }
            }

            setRecentEntries((recentIn || []).map(r => ({
                id: r.log_id,
                plate: r.plate_number || '—',
                slot: entrySlotsMap[r.log_id] || '—',
                time: formatTimeVN(r.event_time),
            })));

            setRecentExits((recentOut || []).map(r => ({
                id: r.log_id,
                plate: r.plate_number || '—',
                slot: exitSlotsMap[r.log_id] || '—',
                time: formatTimeVN(r.event_time),
            })));

            // Query building's recent incidents log (lost cards)
            try {
                const { data: lostLogs } = await supabase
                    .from('card_lost_log')
                    .select('lost_report_id, reported_at, status, vehicle:vehicle_id(plate_number)')
                    .eq('building_id', bldId)
                    .gte('reported_at', startDate)
                    .lte('reported_at', endDate)
                    .order('reported_at', { ascending: false })
                    .limit(5);

                const recentIncidents = (lostLogs || []).map(row => ({
                    id: row.lost_report_id,
                    identifier: row.vehicle?.plate_number || `LOST-${row.lost_report_id.slice(0, 8)}`,
                    type: 'MẤT THẺ',
                    status: (row.status || 'Đang chờ').toUpperCase(),
                    statusClass: row.status === 'Đã giải quyết' ? 'db-badge--done' : 'db-badge--pending',
                }));
                setIncidents(recentIncidents);
            } catch (e) {
                console.error('[ManagerDashboard] Error fetching building incidents:', e);
            }

            setLastUpdated(new Date());
        } catch (err) {
            console.error('[ManagerDashboard] loadData error:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [dashboardPeriod, selectedCustomDate, selectedCustomMonth]);

    // ── Init ──
    useEffect(() => {
        (async () => {
            await fetchBuildingId();
        })();
    }, [fetchBuildingId]);

    // Load / re-load when building or date filters change
    useEffect(() => {
        if (buildingId) {
            loadData(buildingId);
        }
    }, [buildingId, dashboardPeriod, selectedCustomDate, selectedCustomMonth, loadData]);

    const handleRefresh = () => {
        if (!buildingId) return;
        setIsRefreshing(true);
        loadData(buildingId);
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
            recentIn: recentEntries,
            recentOut: recentExits,
            incidents,
            formatVND
        });
    };

    const fillRate = stats.totalSlots > 0
        ? Math.round((stats.occupiedSlots / stats.totalSlots) * 100)
        : 0;

    const maxTrafficVal = Math.max(...trafficChartData.map(t => t.val), 1);

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
            <div className="mgr-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div className="mgr-header-left" style={{ flexShrink: 0 }}>
                    <h1 className="mgr-h1" style={{ margin: 0 }}>
                        {buildingName && (
                            <span className="mgr-building-tag">
                                <span className="material-symbols-outlined">apartment</span>
                                {buildingName}
                            </span>
                        )}
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', flexShrink: 0 }}>
                    {/* Bộ lọc thời gian giống Admin */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        height: '42px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                    }}>
                        {/* Theo ngày */}
                        <button
                            type="button"
                            onClick={() => setDashboardPeriod('day')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 14px',
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
                                gap: '6px',
                                padding: '0 14px',
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
                                gap: '6px',
                                padding: '0 14px',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                            Xuất Excel
                        </button>
                    </div>

                    <button
                        type="button"
                        className={`custom-dashboard-refresh-btn ${isRefreshing ? 'mgr-refresh-btn--spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', boxSizing: 'border-box' }}
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        {isRefreshing ? 'Đang cập nhật…' : 'Làm mới'}
                    </button>
                </div>
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
                        <div className="mgr-kpi-label">
                            {dashboardPeriod === 'day' ? `LƯỢT XE NGÀY ${dateFormatted}` : 
                             dashboardPeriod === 'week' ? `LƯỢT XE TUẦN ${weekLabel}` : 
                             `LƯỢT XE THÁNG ${monthFormatted}`}
                        </div>
                        <div className="mgr-kpi-value">{stats.todayTraffic.toLocaleString('vi-VN')}</div>
                        <div className="mgr-kpi-unit">lượt ra/vào trong khoảng thời gian</div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--emerald">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">
                            {dashboardPeriod === 'day' ? `DOANH THU NGÀY ${dateFormatted}` : 
                             dashboardPeriod === 'week' ? `DOANH THU TUẦN ${weekLabel}` : 
                             `DOANH THU THÁNG ${monthFormatted}`}
                        </div>
                        <div className="mgr-kpi-value mgr-kpi-value--sm">{formatVND(stats.revenueToday)}</div>
                        <div className="mgr-kpi-unit">tiền mặt &amp; QR đã thu</div>
                    </div>
                </div>

                <div className="mgr-kpi mgr-kpi--sky">
                    <div className="mgr-kpi-icon-wrap">
                        <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div className="mgr-kpi-body">
                        <div className="mgr-kpi-label">
                            {dashboardPeriod === 'day' ? `DOANH THU THÁNG ${monthFormatted}` : 'DOANH THU TRUNG BÌNH HÀNG NGÀY'}
                        </div>
                        <div className="mgr-kpi-value mgr-kpi-value--sm">{formatVND(stats.revenueMonth)}</div>
                        <div className="mgr-kpi-unit">
                            {dashboardPeriod === 'day' ? `tổng thu tháng ${monthFormatted}` : 
                             dashboardPeriod === 'week' ? 'trung bình thực tế mỗi ngày trong tuần' : 
                             'trung bình thực tế mỗi ngày trong tháng'}
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Charts Grid ── */}
            <div className="mgr-grid2">

                {/* Biểu đồ lượt xe */}
                <div className="mgr-card">
                    <div className="mgr-card-head">
                        <div className="mgr-card-title-row">
                            <span className="material-symbols-outlined mgr-card-icon">bar_chart</span>
                            <div>
                                <p className="mgr-card-title">
                                    {dashboardPeriod === 'day' ? 'Lượt xe theo giờ' : 'Lượt xe theo ngày'}
                                </p>
                                <p className="mgr-card-desc">
                                    {dashboardPeriod === 'day' 
                                        ? `Phân bố lưu lượng xe ra/vào ngày ${dateFormatted}` 
                                        : dashboardPeriod === 'week'
                                            ? `Phân bố lưu lượng xe ra/vào tuần ${weekLabel}`
                                            : `Phân bố lưu lượng xe ra/vào tháng ${monthFormatted}`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mgr-card-body">
                        {isLoading ? (
                            <div className="mgr-loading">Đang tải...</div>
                        ) : (
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
