/**
 * dashboardService.js
 * Tầng xử lý nghiệp vụ chính của Dashboard ở Backend.
 */

import * as dashboardRepository from "../repositories/dashboardRepository.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Đầu ngày hôm nay (ISO) */
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

/** Format giờ từ ISO/date → "HH:mm" theo timezone Việt Nam */
function formatTimeVN(dateValue) {
    if (!dateValue) return '—';
    try {
        let val = dateValue;
        if (typeof val === 'string') {
            val = val.trim();
            if (val.includes(' ') && !val.includes('T')) {
                val = val.replace(' ', 'T');
            }
            const hasTimezone = val.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(val);
            if (!hasTimezone && val.includes('T')) {
                val = val + 'Z';
            }
        }
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

/** Helper phân loại xe */
function isCar(typeName) {
    if (!typeName) return false;
    const name = typeName.toLowerCase();
    return name.includes('ô tô') || name.includes('o to') || name.includes('car') || name.includes('4 bánh') || name.includes('4 chỗ') || name.includes('7 chỗ') || name.includes('bán tải');
}

function isMotorbike(typeName) {
    if (!typeName) return false;
    const name = typeName.toLowerCase();
    return name.includes('máy') || name.includes('may') || name.includes('moped') || name.includes('motorbike') || name.includes('2 bánh') || name.includes('môtô') || name.includes('moto');
}

function resolveIncidentStatusClass(status) {
    if (!status) return 'db-badge--waiting';
    const s = status.toLowerCase();
    if (s.includes('hoàn thành') || s.includes('đã xử lý') || s.includes('xong')) return 'db-badge--done';
    return 'db-badge--waiting';
}

const VEHICLE_TYPE_COLOR_MAP = {
    'Xe máy': '#10B981', // Xanh lá
    'Ô tô': '#EAB308',  // Vàng
};
const VEHICLE_TYPE_COLOR_DEFAULT = '#FBBF24';

// ─── Core Logic ──────────────────────────────────────────────────────────────

/** 1. Tổng hợp dữ liệu KPI chính và biểu đồ hiển thị ở Dashboard chính */
export async function getSummaryData(buildingId = null) {
    const activeSessions = await dashboardRepository.getActiveSessionsCount(buildingId);
    const availableSlots = await dashboardRepository.getAvailableSlotsCount(buildingId);

    // 2. Chỗ đã sử dụng
    let occupiedSlots = await dashboardRepository.getOccupiedSlotsCountRaw(buildingId);
    if (occupiedSlots === 0) {
        const sessData = await dashboardRepository.getActiveSessionSlots();
        const unique = new Set((sessData ?? []).map((r) => r.slot_id));
        if (unique.size > 0) {
            occupiedSlots = unique.size;
        } else {
            const countRaw = await dashboardRepository.getActiveSessionsCountRaw();
            if ((countRaw ?? []).length > 0) {
                occupiedSlots = countRaw.length;
            } else {
                occupiedSlots = activeSessions;
            }
        }
    }

    const startToday = startOfToday();
    const endToday = endOfToday();
    const startMonth = startOfCurrentMonth();
    const endMonth = endOfCurrentMonth();

    const [
        todayIncidentsObj,
        todayPayments,
        monthPayments,
        hourlyTraffic,
        floorOccupancy,
        vehicleTypeDistribution,
        recentEntries,
        recentExits,
        recentIncidents,
    ] = await Promise.all([
        dashboardRepository.getTodayIncidentsCounts(startToday, endToday, buildingId),
        dashboardRepository.getPaymentsInPeriod(startToday, endToday, buildingId),
        dashboardRepository.getPaymentsInPeriod(startMonth, endMonth, buildingId),
        fetchHourlyTraffic(startToday, endToday, buildingId),
        fetchFloorOccupancy(buildingId),
        fetchVehicleTypeDistribution(buildingId),
        fetchRecentEntries(buildingId),
        fetchRecentExits(buildingId),
        fetchRecentIncidents(buildingId),
    ]);

    // Tính doanh thu tổng
    const todayRevenue = (todayPayments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const monthRevenue = (monthPayments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
        activeSessions,
        availableSlots,
        occupiedSlots,
        todayIncidents: todayIncidentsObj.lostCount + todayIncidentsObj.incidentCount,
        todayRevenue,
        monthRevenue,
        hourlyTraffic,
        floorOccupancy,
        vehicleTypeDistribution,
        recentEntries,
        recentExits,
        recentIncidents,
    };
}

/** 2. Phân bố lưu lượng xe vào theo giờ */
async function fetchHourlyTraffic(start, end, buildingId = null) {
    const result = Array(24).fill(0);
    try {
        const getHourVN = (dateStr) => {
            if (!dateStr) return -1;
            let val = dateStr.trim();
            if (val.includes(' ') && !val.includes('T')) {
                val = val.replace(' ', 'T');
            }
            if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) {
                val = val + 'Z';
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return -1;
            const hourStr = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                hour12: false,
                timeZone: 'Asia/Ho_Chi_Minh'
            }).format(d);
            const h = parseInt(hourStr, 10);
            return h === 24 ? 0 : h;
        };

        const logs = await dashboardRepository.getHourlyTrafficLogs(start, end, buildingId);
        if (logs && logs.length > 0) {
            logs.forEach((row) => {
                const h = getHourVN(row.event_time);
                if (h >= 0 && h <= 23) result[h]++;
            });
            return result;
        }

        const sessions = await dashboardRepository.getHourlyTrafficSessions(start, end, buildingId);
        (sessions ?? []).forEach((row) => {
            const h = getHourVN(row.entry_time);
            if (h >= 0 && h <= 23) result[h]++;
        });
        return result;
    } catch (err) {
        console.error('[DashboardService] fetchHourlyTraffic err:', err.message);
        return result;
    }
}

/** 3. Tỷ lệ lấp đầy theo tầng */
async function fetchFloorOccupancy(buildingId = null) {
    try {
        const data = await dashboardRepository.getSlotsWithFloors(buildingId);
        const floorMap = new Map();

        (data ?? []).forEach((slot) => {
            const floor = slot.area?.floor;
            if (!floor?.floor_id) return;
            const key = floor.floor_id;

            if (!floorMap.has(key)) {
                const parkingName = floor.parking?.name || '';
                const shortParking = parkingName.includes(' - ')
                    ? parkingName.split(' - ').pop()
                    : parkingName;
                const label = shortParking
                    ? `${shortParking} / ${floor.name || `Tầng ${floor.floor_number}`}`
                    : (floor.name || `Tầng ${floor.floor_number}`);

                floorMap.set(key, {
                    floorId: floor.floor_id,
                    floorNumber: Number(floor.floor_number) || 1,
                    floorName: label,
                    totalSlots: 0,
                    occupiedSlots: 0,
                });
            }
            const entry = floorMap.get(key);
            entry.totalSlots++;
        });

        // 2. Phân bổ đồng bộ theo loại xe: Xe máy -> Floor 1, Ô tô -> Floor 2
        const activeVehicles = await dashboardRepository.getActiveSessionsVehicles(buildingId);
        if ((activeVehicles ?? []).length > 0) {
            let motorbikeCount = 0;
            let carCount = 0;
            activeVehicles.forEach((row) => {
                const name = row.vehicle?.vehicle_type?.name || '';
                const plate = (row.plate_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (isCar(name) || plate.startsWith('30K') || plate.startsWith('36A') || plate.startsWith('30A') || plate.startsWith('51K')) {
                    carCount++;
                } else {
                    motorbikeCount++;
                }
            });

            [...floorMap.values()].forEach((floor) => {
                const fName = (floor.floorName || '').toLowerCase();
                if (fName.includes('floor 1') || fName.includes('tầng 1')) {
                    floor.occupiedSlots = Math.min(motorbikeCount, floor.totalSlots);
                } else if (fName.includes('floor 2') || fName.includes('tầng 2')) {
                    floor.occupiedSlots = Math.min(carCount, floor.totalSlots);
                } else {
                    floor.occupiedSlots = Math.min(motorbikeCount, floor.totalSlots);
                }
            });
        }

        const allFloors = [...floorMap.values()].map((f) => ({
            ...f,
            percentage: f.totalSlots > 0 ? Math.round((f.occupiedSlots / f.totalSlots) * 100) : 0,
        }));

        allFloors.sort((a, b) => a.floorNumber - b.floorNumber);
        return allFloors;
    } catch (err) {
        console.error('[DashboardService] fetchFloorOccupancy err:', err.message);
        return [];
    }
}

/** 4. Phân phối loại phương tiện */
async function fetchVehicleTypeDistribution(buildingId = null) {
    try {
        const sourceData = await dashboardRepository.getActiveSessionsVehicles(buildingId);
        const typeCount = {};
        (sourceData ?? []).forEach((row) => {
            const name = row.vehicle?.vehicle_type?.name;
            if (!name) return;
            typeCount[name] = (typeCount[name] || 0) + 1;
        });

        const total = Object.values(typeCount).reduce((s, v) => s + v, 0);
        return Object.entries(typeCount).map(([vehicleTypeName, count]) => ({
            vehicleTypeName,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            color: VEHICLE_TYPE_COLOR_MAP[vehicleTypeName] ?? VEHICLE_TYPE_COLOR_DEFAULT,
        }));
    } catch (err) {
        console.error('[DashboardService] fetchVehicleTypeDistribution err:', err.message);
        return [];
    }
}

/** 5. Xe vào gần đây */
async function fetchRecentEntries(buildingId = null) {
    try {
        const logData = await dashboardRepository.getRecentEntryLogs(buildingId);
        if (logData && logData.length > 0) {
            const seen = new Set();
            const unique = logData.filter((r) => {
                if (seen.has(r.log_id)) return false;
                seen.add(r.log_id);
                return true;
            });

            return unique.map((row) => ({
                id: row.log_id,
                plate: row.plate_number || '—',
                slot: '—',
                time: formatTimeVN(row.event_time),
            }));
        }

        const sessData = await dashboardRepository.getRecentEntrySessions(buildingId);
        const seenSess = new Set();
        return (sessData ?? []).filter((r) => {
            if (seenSess.has(r.session_id)) return false;
            seenSess.add(r.session_id);
            return true;
        }).map((row) => ({
            id: row.session_id,
            plate: row.plate_number || '—',
            slot: '—',
            time: formatTimeVN(row.entry_time),
        }));
    } catch (err) {
        console.error('[DashboardService] fetchRecentEntries err:', err.message);
        return [];
    }
}

/** 6. Xe ra gần đây */
async function fetchRecentExits(buildingId = null) {
    try {
        const logData = await dashboardRepository.getRecentExitLogs(buildingId);
        if (logData && logData.length > 0) {
            const seen = new Set();
            return logData.filter((r) => {
                if (seen.has(r.log_id)) return false;
                seen.add(r.log_id);
                return true;
            }).map((row) => ({
                id: row.log_id,
                plate: row.plate_number || '—',
                slot: '—',
                time: formatTimeVN(row.event_time),
            }));
        }

        const sessData = await dashboardRepository.getRecentExitSessions(buildingId);
        const seenSess = new Set();
        return (sessData ?? []).filter((r) => {
            if (seenSess.has(r.session_id)) return false;
            seenSess.add(r.session_id);
            return true;
        }).map((row) => ({
            id: row.session_id,
            plate: row.plate_number || '—',
            slot: '—',
            time: formatTimeVN(row.exit_time),
        }));
    } catch (err) {
        console.error('[DashboardService] fetchRecentExits err:', err.message);
        return [];
    }
}

/** 7. Sự cố gần đây */
async function fetchRecentIncidents(buildingId = null) {
    try {
        const results = [];

        try {
            const lostData = await dashboardRepository.getRecentLostCards(buildingId);
            (lostData ?? []).forEach((row) => {
                results.push({
                    id: row.lost_report_id,
                    identifier: row.vehicle?.plate_number || `LOST-${row.lost_report_id.slice(0, 8)}`,
                    type: 'MẤT THẺ',
                    status: (row.status || 'Đang chờ').toUpperCase(),
                    statusClass: resolveIncidentStatusClass(row.status),
                    sortTime: row.reported_at,
                });
            });
        } catch (e) {
            console.warn('[DashboardService] fetchRecentIncidents lost fetch err:', e.message);
        }

        try {
            const incData = await dashboardRepository.getRecentIncidentReports(buildingId);
            (incData ?? []).forEach((row) => {
                const plate = row.session?.plate_number;
                const cardCode = row.session?.card_code;
                results.push({
                    id: row.incident_id,
                    identifier: plate || cardCode || `INC-${row.incident_id.slice(0, 8)}`,
                    type: (row.incident_type || '—').toUpperCase(),
                    status: (row.status || '—').toUpperCase(),
                    statusClass: resolveIncidentStatusClass(row.status),
                    sortTime: row.created_at,
                });
            });
        } catch (e) {
            console.warn('[DashboardService] fetchRecentIncidents report fetch err:', e.message);
        }

        results.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));

        const seen = new Set();
        return results.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        }).slice(0, 5);
    } catch (err) {
        console.error('[DashboardService] fetchRecentIncidents err:', err.message);
        return [];
    }
}

/** 8. Chi tiết doanh thu hôm nay (Breakdown Modal) */
export async function getTodayRevenueBreakdown(buildingId = null) {
    try {
        const start = startOfToday();
        const end = endOfToday();

        const payments = await dashboardRepository.getPaymentsInPeriod(start, end, buildingId);
        const totalCardRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const result = {
            total: totalCardRevenue,
            casual: { total: 0, items: {} },
            monthlyNew: { total: 0, items: {} },
            renewals: { total: 0, items: {} }
        };

        const sessionIds = [...new Set((payments || []).map(p => p.session_id).filter(Boolean))];
        const vpIds = [...new Set((payments || []).map(p => p.vehicle_package_id).filter(Boolean))];

        const sessionMap = {};
        const vpMap = {};

        if (sessionIds.length > 0) {
            try {
                const sData = await dashboardRepository.getSessionsVehicleTypes(sessionIds);
                (sData || []).forEach(s => { sessionMap[s.session_id] = s.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn('[DashboardService] session enrich err:', e.message); }
        }
        if (vpIds.length > 0) {
            try {
                const vpData = await dashboardRepository.getVehiclePackagesDetails(vpIds);
                (vpData || []).forEach(vp => {
                    const vType = vp.package?.vehicle_type?.type_name || vp.vehicle?.vehicle_type?.type_name || null;
                    const pName = vp.package?.package_name || (vp.package?.duration_month ? `Gói ${vp.package.duration_month} tháng` : 'Gói thẻ tháng');
                    vpMap[vp.vehicle_package_id] = { vehicleType: vType, packageName: pName };
                });
            } catch (e) { console.warn('[DashboardService] vp enrich err:', e.message); }
        }

        (payments || []).forEach(p => {
            const amt = Number(p.amount) || 0;
            const pType = p.payment_type || 'CASUAL';

            if (pType === 'CASUAL' || pType === 'Vé lượt') {
                result.casual.total += amt;
                let rawType = sessionMap[p.session_id] || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                if (!result.casual.items[vTypeLabel]) {
                    result.casual.items[vTypeLabel] = { vehicleType: vTypeLabel, count: 0, revenue: 0 };
                }
                result.casual.items[vTypeLabel].count += 1;
                result.casual.items[vTypeLabel].revenue += amt;

            } else if (pType === 'MONTHLY_NEW' || pType === 'Đăng ký vé tháng') {
                result.monthlyNew.total += amt;
                const info = vpMap[p.vehicle_package_id];
                let rawType = info?.vehicleType || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                const pName = info?.packageName || 'Gói thẻ tháng';
                const key = `${vTypeLabel}_${pName}`;

                if (!result.monthlyNew.items[key]) {
                    result.monthlyNew.items[key] = { vehicleType: vTypeLabel, packageName: pName, count: 0, revenue: 0 };
                }
                result.monthlyNew.items[key].count += 1;
                result.monthlyNew.items[key].revenue += amt;

            } else if (pType === 'MONTHLY_RENEW' || pType === 'Gia hạn vé tháng') {
                result.renewals.total += amt;
                const info = vpMap[p.vehicle_package_id];
                let rawType = info?.vehicleType || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                const pName = info?.packageName || 'Gia hạn gói thẻ tháng';
                const key = `${vTypeLabel}_${pName}`;

                if (!result.renewals.items[key]) {
                    result.renewals.items[key] = { vehicleType: vTypeLabel, packageName: pName, count: 0, revenue: 0 };
                }
                result.renewals.items[key].count += 1;
                result.renewals.items[key].revenue += amt;
            }
        });

        return {
            total: result.total,
            casual: {
                total: result.casual.total,
                items: Object.values(result.casual.items)
            },
            monthlyNew: {
                total: result.monthlyNew.total,
                items: Object.values(result.monthlyNew.items)
            },
            renewals: {
                total: result.renewals.total,
                items: Object.values(result.renewals.items)
            }
        };
    } catch (err) {
        console.error('[DashboardService] getTodayRevenueBreakdown error:', err);
        return { total: 0, casual: { total: 0, items: [] }, monthlyNew: { total: 0, items: [] }, renewals: { total: 0, items: [] } };
    }
}

/** 9. Chi tiết doanh thu tháng này theo tuần (Breakdown Modal) */
export async function getMonthlyRevenueBreakdown(buildingId = null) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const lastDayObj = new Date(year, month + 1, 0);
        const totalDays = lastDayObj.getDate();
        const monthStr = month + 1 < 10 ? '0' + (month + 1) : month + 1;

        const weeksConfig = [
            { id: 'week1', label: `Tuần 1 (01/${monthStr} - 07/${monthStr})`, startDay: 1, endDay: 7 },
            { id: 'week2', label: `Tuần 2 (08/${monthStr} - 14/${monthStr})`, startDay: 8, endDay: 14 },
            { id: 'week3', label: `Tuần 3 (15/${monthStr} - 21/${monthStr})`, startDay: 15, endDay: 21 },
            { id: 'week4', label: `Tuần 4 (22/${monthStr} - 28/${monthStr})`, startDay: 22, endDay: 28 },
        ];

        if (totalDays > 28) {
            weeksConfig.push({
                id: 'week5',
                label: `Tuần 5 (29/${monthStr} - ${totalDays < 10 ? '0' + totalDays : totalDays}/${monthStr})`,
                startDay: 29,
                endDay: totalDays
            });
        }

        const monthStartIso = startOfCurrentMonth();
        const monthEndIso = endOfCurrentMonth();

        const payments = await dashboardRepository.getPaymentsInPeriod(monthStartIso, monthEndIso, buildingId);
        const monthTotal = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const sessionIds = [...new Set((payments || []).map(p => p.session_id).filter(Boolean))];
        const vpIds = [...new Set((payments || []).map(p => p.vehicle_package_id).filter(Boolean))];

        const sessionMap = {};
        const vpMap = {};

        if (sessionIds.length > 0) {
            try {
                const sData = await dashboardRepository.getSessionsVehicleTypes(sessionIds);
                (sData || []).forEach(s => { sessionMap[s.session_id] = s.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn(e.message); }
        }
        if (vpIds.length > 0) {
            try {
                const vpData = await dashboardRepository.getVehiclePackagesDetails(vpIds);
                (vpData || []).forEach(vp => {
                    const vType = vp.package?.vehicle_type?.type_name || vp.vehicle?.vehicle_type?.type_name || null;
                    const pName = vp.package?.package_name || (vp.package?.duration_month ? `Gói ${vp.package.duration_month} tháng` : 'Gói thẻ tháng');
                    vpMap[vp.vehicle_package_id] = { vehicleType: vType, packageName: pName };
                });
            } catch (e) { console.warn(e.message); }
        }

        const weeksResult = {};
        weeksConfig.forEach(w => {
            weeksResult[w.id] = {
                id: w.id,
                label: w.label,
                totalRevenue: 0,
                casual: {},
                monthlyNew: {},
                renewals: {}
            };
        });

        (payments || []).forEach(p => {
            const pDate = new Date(p.payment_time);
            const dayOfMonth = pDate.getDate();
            const amt = Number(p.amount) || 0;

            const week = weeksConfig.find(w => dayOfMonth >= w.startDay && dayOfMonth <= w.endDay);
            if (!week) return;

            const targetWeek = weeksResult[week.id];
            targetWeek.totalRevenue += amt;

            const pType = p.payment_type || 'CASUAL';

            if (pType === 'CASUAL' || pType === 'Vé lượt') {
                let rawType = sessionMap[p.session_id] || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                targetWeek.casual[vTypeLabel] = (targetWeek.casual[vTypeLabel] || 0) + amt;

            } else if (pType === 'MONTHLY_NEW' || pType === 'Đăng ký vé tháng') {
                const info = vpMap[p.vehicle_package_id];
                let rawType = info?.vehicleType || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                const pName = info?.packageName || 'Gói thẻ tháng';
                const key = `${vTypeLabel}_${pName}`;

                if (!targetWeek.monthlyNew[key]) {
                    targetWeek.monthlyNew[key] = { vehicleType: vTypeLabel, packageName: pName, count: 0, revenue: 0 };
                }
                targetWeek.monthlyNew[key].count += 1;
                targetWeek.monthlyNew[key].revenue += amt;

            } else if (pType === 'MONTHLY_RENEW' || pType === 'Gia hạn vé tháng') {
                const info = vpMap[p.vehicle_package_id];
                let rawType = info?.vehicleType || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                const pName = info?.packageName || 'Gia hạn gói thẻ tháng';
                const key = `${vTypeLabel}_${pName}`;

                if (!targetWeek.renewals[key]) {
                    targetWeek.renewals[key] = { vehicleType: vTypeLabel, packageName: pName, count: 0, revenue: 0 };
                }
                targetWeek.renewals[key].count += 1;
                targetWeek.renewals[key].revenue += amt;
            }
        });

        return {
            monthTotal,
            weeks: weeksResult
        };
    } catch (err) {
        console.error('[DashboardService] getMonthlyRevenueBreakdown error:', err);
        return { monthTotal: 0, weeks: {} };
    }
}
