/**
 * dashboardService.js
 * Service Supabase cho màn hình Dashboard.
 *
 * Mỗi hàm:
 * - Có try/catch riêng → không crash Dashboard nếu một metric lỗi
 * - Trả về giá trị an toàn (0, [], ...) khi gặp lỗi
 * - Có comment rõ nguồn bảng đang dùng
 *
 * Fallback mock được gom vào dashboardFallbackData ở cuối file.
 * Mỗi fallback đều có comment: // TODO: replace with real database field when available
 */

import supabase from '../config/supabaseClient';

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

/** Format số tiền VND: 14000 → "14.000 ₫" */
export function formatVND(amount) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(amount));
}

/**
 * Format giờ từ ISO/date → "HH:mm" theo timezone Việt Nam.
 * Luôn dùng timeZone: 'Asia/Ho_Chi_Minh' để tránh lệch giờ do UTC/local.
 */
export function formatTimeVN(dateValue) {
    if (!dateValue) return '—';
    try {
        let val = dateValue;
        if (typeof val === 'string') {
            val = val.trim();
            // Replace space with T to make it ISO standard if needed
            if (val.includes(' ') && !val.includes('T')) {
                val = val.replace(' ', 'T');
            }
            // Check if there is already a timezone offset or 'Z' suffix
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

// Backward-compatible alias
export const formatHHmm = formatTimeVN;

// ─── Màu theo loại xe – yellow and green palette ─────────────────────────────
// TODO: replace with real database field when available (vehicle_type.color nếu có)
const VEHICLE_TYPE_COLOR_MAP = {
    'Xe máy': '#10B981', // Xanh lá
    'Ô tô': '#EAB308',  // Vàng
};
const VEHICLE_TYPE_COLOR_DEFAULT = '#FBBF24';

// ─── Fallback mock data ───────────────────────────────────────────────────────
// Chỉ dùng khi database chưa có dữ liệu phù hợp.
// KHÔNG mock đè lên dữ liệu thật.
export const dashboardFallbackData = {
    // TODO: replace with real database field when available
    // payment chưa có seed (phụ thuộc parking_order → profiles → auth.users)
    revenueTrendBars: [
        { label: 'T2', h: 120, peak: false },
        { label: 'T3', h: 170, peak: false },
        { label: 'T4', h: 95, peak: false },
        { label: 'T5', h: 140, peak: false },
        { label: 'T6', h: 210, peak: false },
        { label: 'T7', h: 230, peak: true },
        { label: 'CN', h: 150, peak: false },
    ],
    revenueTrendMaxBar: 230,
};

// ─── 1. Phiên đang hoạt động ─────────────────────────────────────────────────
// Nguồn: parking_sessions.status = 'Đang gửi xe'
// Fallback: parking_order.status = 'Đang gửi xe'
export async function fetchActiveSessions() {
    try {
        const { count, error } = await supabase
            .from('parking_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Đang gửi xe');
        if (error) throw error;
        if ((count ?? 0) > 0) return count;

        // Fallback về parking_order nếu parking_sessions rỗng
        const { count: count2, error: err2 } = await supabase
            .from('parking_order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Đang gửi xe');
        if (err2) throw err2;
        return count2 ?? 0;
    } catch (err) {
        console.error('[Dashboard] fetchActiveSessions:', err.message);
        return 0;
    }
}

// ─── 2. Chỗ trống khả dụng ───────────────────────────────────────────────────
// Nguồn: slot.status = 'Sẵn sàng'
export async function fetchAvailableSlots() {
    try {
        const { count, error } = await supabase
            .from('slot')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Sẵn sàng');
        if (error) throw error;
        return count ?? 0;
    } catch (err) {
        console.error('[Dashboard] fetchAvailableSlots:', err.message);
        return 0;
    }
}

// ─── 3. Chỗ đã sử dụng ───────────────────────────────────────────────────────
// Ưu tiên 1: slot.status = 'Đang sử dụng'
// Ưu tiên 2: distinct slot_id từ parking_order / parking_sessions active
// Ưu tiên 3: fallback = activeSessions (không để mâu thuẫn KPI)
// TODO: replace fallback when slot status is updated correctly on vehicle entry/exit.
export async function fetchOccupiedSlots(activeSessions = 0) {
    try {
        // 1. slot.status = 'Đang sử dụng'
        const { count, error } = await supabase
            .from('slot')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Đang sử dụng');
        if (error) throw error;
        if ((count ?? 0) > 0) return count;

        // 2a. distinct slot_id từ parking_order active
        const { data: orderData, error: orderErr } = await supabase
            .from('parking_order')
            .select('slot_id')
            .eq('status', 'Đang gửi xe')
            .not('slot_id', 'is', null);
        if (!orderErr) {
            const unique = new Set((orderData ?? []).map((r) => r.slot_id));
            if (unique.size > 0) return unique.size;
        }

        // 2b. distinct slot_id từ parking_sessions active (nếu có)
        const { data: sessData, error: sessErr } = await supabase
            .from('parking_sessions')
            .select('session_id')
            .eq('status', 'Đang gửi xe');
        if (!sessErr && (sessData ?? []).length > 0) {
            // parking_sessions không có FK slot → dùng count session
            return sessData.length;
        }

        // 3. Fallback: dùng activeSessions để không mâu thuẫn với KPI
        // TODO: replace fallback when slot status is updated correctly on vehicle entry/exit.
        return activeSessions;
    } catch (err) {
        console.error('[Dashboard] fetchOccupiedSlots:', err.message);
        // TODO: replace fallback when slot status is updated correctly on vehicle entry/exit.
        return activeSessions;
    }
}

// ─── 4. Sự cố hôm nay ────────────────────────────────────────────────────────
// Nguồn: card_lost_log.reported_at hôm nay + incident_report.created_at hôm nay
export async function fetchTodayIncidents() {
    try {
        const start = startOfToday();
        const end = endOfToday();

        const [lostRes, incRes] = await Promise.all([
            supabase
                .from('card_lost_log')
                .select('*', { count: 'exact', head: true })
                .gte('reported_at', start)
                .lte('reported_at', end),
            supabase
                .from('incident_report')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start)
                .lte('created_at', end),
        ]);

        if (lostRes.error) console.warn('[Dashboard] card_lost_log count:', lostRes.error.message);
        if (incRes.error) console.warn('[Dashboard] incident_report count:', incRes.error.message);

        return (lostRes.count ?? 0) + (incRes.count ?? 0);
    } catch (err) {
        console.error('[Dashboard] fetchTodayIncidents:', err.message);
        return 0;
    }
}

// ─── 5. Doanh thu hôm nay (Tổng cộng) ──────────────────────────────────────────
export async function fetchTodayTotalRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .gte('payment_time', startOfToday())
            .lte('payment_time', endOfToday());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchTodayTotalRevenue:', err.message);
        return 0;
    }
}

// ─── 6. Doanh thu tháng (Tổng cộng) ────────────────────────────────────────────
export async function fetchMonthTotalRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .gte('payment_time', startOfCurrentMonth())
            .lte('payment_time', endOfCurrentMonth());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchMonthTotalRevenue:', err.message);
        return 0;
    }
}

// Backward-compatible aliases
export const fetchTodayRevenue = fetchTodayTotalRevenue;
export const fetchMonthRevenue = fetchMonthTotalRevenue;

// ─── 6a. Doanh thu hôm nay (Casual) ──────────────────────────────────────────
export async function fetchTodayCasualRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .eq('payment_type', 'CASUAL')
            .gte('payment_time', startOfToday())
            .lte('payment_time', endOfToday());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchTodayCasualRevenue:', err.message);
        return 0;
    }
}

// ─── 6b. Doanh thu tháng (Casual) ────────────────────────────────────────────
export async function fetchMonthCasualRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .eq('payment_type', 'CASUAL')
            .gte('payment_time', startOfCurrentMonth())
            .lte('payment_time', endOfCurrentMonth());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchMonthCasualRevenue:', err.message);
        return 0;
    }
}

// ─── 6c. Doanh thu hôm nay (Thẻ tháng - New + Renew) ──────────────────────────
export async function fetchTodayMonthlyRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .in('payment_type', ['MONTHLY_NEW', 'MONTHLY_RENEW'])
            .gte('payment_time', startOfToday())
            .lte('payment_time', endOfToday());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchTodayMonthlyRevenue:', err.message);
        return 0;
    }
}

// ─── 6d. Doanh thu tháng (Thẻ tháng - New + Renew) ────────────────────────────
export async function fetchMonthMonthlyRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .in('payment_type', ['MONTHLY_NEW', 'MONTHLY_RENEW'])
            .gte('payment_time', startOfCurrentMonth())
            .lte('payment_time', endOfCurrentMonth());
        if (error) throw error;
        return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[Dashboard] fetchMonthMonthlyRevenue:', err.message);
        return 0;
    }
}

// ─── 6e. Số lượng đăng ký mới thẻ tháng trong tháng ───────────────────────────
export async function fetchMonthlyNewCount() {
    try {
        const { count, error } = await supabase
            .from('payment')
            .select('payment_id', { count: 'exact', head: true })
            .eq('status', 'Đã thanh toán')
            .eq('payment_type', 'MONTHLY_NEW')
            .gte('payment_time', startOfCurrentMonth())
            .lte('payment_time', endOfCurrentMonth());
        if (error) throw error;
        return count ?? 0;
    } catch (err) {
        console.error('[Dashboard] fetchMonthlyNewCount:', err.message);
        return 0;
    }
}

// ─── 6f. Số lượng gia hạn thẻ tháng trong tháng ────────────────────────────────
export async function fetchMonthlyRenewCount() {
    try {
        const { count, error } = await supabase
            .from('payment')
            .select('payment_id', { count: 'exact', head: true })
            .eq('status', 'Đã thanh toán')
            .eq('payment_type', 'MONTHLY_RENEW')
            .gte('payment_time', startOfCurrentMonth())
            .lte('payment_time', endOfCurrentMonth());
        if (error) throw error;
        return count ?? 0;
    } catch (err) {
        console.error('[Dashboard] fetchMonthlyRenewCount:', err.message);
        return 0;
    }
}

// ─── Helpers phân loại xe cho Detail Modal ──────────────────────────────────────
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

// ─── 6g. Chi tiết doanh thu hôm nay (Breakdown Modal) ──────────────────────────
export async function fetchTodayRevenueDetails() {
    try {
        const start = startOfToday();
        const end = endOfToday();

        const { data: payments, error } = await supabase
            .from('payment')
            .select('payment_id, amount, payment_type, session_id, parking_order_id, vehicle_package_id, status')
            .eq('status', 'Đã thanh toán')
            .gte('payment_time', start)
            .lte('payment_time', end);

        if (error) throw error;

        const totalCardRevenue = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        console.log('[Dashboard Check] Today Card Total vs Detail Total:', totalCardRevenue);

        const result = {
            total: totalCardRevenue,
            casual: { total: 0, items: {} },
            monthlyNew: { total: 0, items: {} },
            renewals: { total: 0, items: {} }
        };

        const sessionIds = [...new Set((payments || []).map(p => p.session_id).filter(Boolean))];
        const orderIds = [...new Set((payments || []).map(p => p.parking_order_id).filter(Boolean))];
        const vpIds = [...new Set((payments || []).map(p => p.vehicle_package_id).filter(Boolean))];

        const sessionMap = {};
        const orderMap = {};
        const vpMap = {};

        if (sessionIds.length > 0) {
            try {
                const { data: sData } = await supabase.from('parking_sessions').select('session_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('session_id', sessionIds);
                (sData || []).forEach(s => { sessionMap[s.session_id] = s.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn('[Dashboard] session enrich err:', e); }
        }
        if (orderIds.length > 0) {
            try {
                const { data: oData } = await supabase.from('parking_order').select('parking_order_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('parking_order_id', orderIds);
                (oData || []).forEach(o => { orderMap[o.parking_order_id] = o.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn('[Dashboard] order enrich err:', e); }
        }
        if (vpIds.length > 0) {
            try {
                const { data: vpData } = await supabase.from('vehicle_package').select('vehicle_package_id, package:package_id(package_name, duration_month, vehicle_type:vehicle_type_id(type_name)), vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('vehicle_package_id', vpIds);
                (vpData || []).forEach(vp => {
                    const vType = vp.package?.vehicle_type?.type_name || vp.vehicle?.vehicle_type?.type_name || null;
                    const pName = vp.package?.package_name || (vp.package?.duration_month ? `Gói ${vp.package.duration_month} tháng` : 'Gói thẻ tháng');
                    vpMap[vp.vehicle_package_id] = { vehicleType: vType, packageName: pName };
                });
            } catch (e) { console.warn('[Dashboard] vp enrich err:', e); }
        }

        (payments || []).forEach(p => {
            const amt = Number(p.amount) || 0;
            const pType = p.payment_type || 'CASUAL';

            if (pType === 'CASUAL') {
                result.casual.total += amt;
                let rawType = sessionMap[p.session_id] || orderMap[p.parking_order_id] || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                if (!result.casual.items[vTypeLabel]) {
                    result.casual.items[vTypeLabel] = { vehicleType: vTypeLabel, count: 0, revenue: 0 };
                }
                result.casual.items[vTypeLabel].count += 1;
                result.casual.items[vTypeLabel].revenue += amt;

            } else if (pType === 'MONTHLY_NEW') {
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

            } else if (pType === 'MONTHLY_RENEW') {
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
        console.error('[Dashboard] fetchTodayRevenueDetails error:', err);
        return { total: 0, casual: { total: 0, items: [] }, monthlyNew: { total: 0, items: [] }, renewals: { total: 0, items: [] } };
    }
}

// ─── 6h. Chi tiết doanh thu tháng theo tuần (Breakdown Modal) ───────────────────
export async function fetchMonthlyRevenueDetails() {
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

        const { data: payments, error } = await supabase
            .from('payment')
            .select('payment_id, amount, payment_type, payment_time, session_id, parking_order_id, vehicle_package_id, status')
            .eq('status', 'Đã thanh toán')
            .gte('payment_time', monthStartIso)
            .lte('payment_time', monthEndIso);

        if (error) throw error;

        const monthTotal = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        console.log('[Dashboard Check] Month Card Total vs Detail Total:', monthTotal);

        const sessionIds = [...new Set((payments || []).map(p => p.session_id).filter(Boolean))];
        const orderIds = [...new Set((payments || []).map(p => p.parking_order_id).filter(Boolean))];
        const vpIds = [...new Set((payments || []).map(p => p.vehicle_package_id).filter(Boolean))];

        const sessionMap = {};
        const orderMap = {};
        const vpMap = {};

        if (sessionIds.length > 0) {
            try {
                const { data: sData } = await supabase.from('parking_sessions').select('session_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('session_id', sessionIds);
                (sData || []).forEach(s => { sessionMap[s.session_id] = s.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn(e); }
        }
        if (orderIds.length > 0) {
            try {
                const { data: oData } = await supabase.from('parking_order').select('parking_order_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('parking_order_id', orderIds);
                (oData || []).forEach(o => { orderMap[o.parking_order_id] = o.vehicle?.vehicle_type?.type_name || null; });
            } catch (e) { console.warn(e); }
        }
        if (vpIds.length > 0) {
            try {
                const { data: vpData } = await supabase.from('vehicle_package').select('vehicle_package_id, package:package_id(package_name, duration_month, vehicle_type:vehicle_type_id(type_name)), vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))').in('vehicle_package_id', vpIds);
                (vpData || []).forEach(vp => {
                    const vType = vp.package?.vehicle_type?.type_name || vp.vehicle?.vehicle_type?.type_name || null;
                    const pName = vp.package?.package_name || (vp.package?.duration_month ? `Gói ${vp.package.duration_month} tháng` : 'Gói thẻ tháng');
                    vpMap[vp.vehicle_package_id] = { vehicleType: vType, packageName: pName };
                });
            } catch (e) { console.warn(e); }
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

            if (pType === 'CASUAL') {
                let rawType = sessionMap[p.session_id] || orderMap[p.parking_order_id] || '';
                let vTypeLabel = 'Chưa phân loại';
                if (isCar(rawType)) vTypeLabel = 'Ô tô';
                else if (isMotorbike(rawType)) vTypeLabel = 'Xe máy';
                else if (rawType) vTypeLabel = rawType;

                targetWeek.casual[vTypeLabel] = (targetWeek.casual[vTypeLabel] || 0) + amt;

            } else if (pType === 'MONTHLY_NEW') {
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

            } else if (pType === 'MONTHLY_RENEW') {
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
        console.error('[Dashboard] fetchMonthlyRevenueDetails error:', err);
        return { monthTotal: 0, weeks: {} };
    }
}

// ─── 7. Lượt xe theo giờ ─────────────────────────────────────────────────────
// Ưu tiên: entry_exit_log direction='Xe vào', group by hour(event_time)
// Fallback: parking_sessions group by hour(entry_time)
// Trả về mảng 24 phần tử [count_00h, count_01h, ..., count_23h]
export async function fetchHourlyTraffic() {
    const result = Array(24).fill(0);
    try {
        const start = startOfToday();
        const end = endOfToday();

        // Thử entry_exit_log trước
        const { data: logData, error: logErr } = await supabase
            .from('entry_exit_log')
            .select('event_time')
            .eq('direction', 'Xe vào')
            .gte('event_time', start)
            .lte('event_time', end);

        if (!logErr && logData && logData.length > 0) {
            logData.forEach((row) => {
                const h = new Date(row.event_time).getHours();
                if (h >= 0 && h <= 23) result[h]++;
            });
            return result;
        }

        // Fallback: parking_sessions.entry_time
        const { data: sessData, error: sessErr } = await supabase
            .from('parking_sessions')
            .select('entry_time')
            .gte('entry_time', start)
            .lte('entry_time', end);

        if (sessErr) throw sessErr;
        (sessData ?? []).forEach((row) => {
            const h = new Date(row.entry_time).getHours();
            if (h >= 0 && h <= 23) result[h]++;
        });
        return result;
    } catch (err) {
        console.error('[Dashboard] fetchHourlyTraffic:', err.message);
        return result; // trả về mảng toàn 0, không crash
    }
}

// ─── 8. Tỷ lệ lấp đầy theo tầng ─────────────────────────────────────────────
// Nguồn: slot → area → floor (GLOBAL scope – khớp với availableSlots / occupiedSlots)
// Group theo floor_id (UUID duy nhất) → không bao giờ trùng dòng.
// Vì seed có ~40 parking × 3 floor = ~120 floors cùng tên "Floor 1/2/3",
// ta chỉ hiển thị top 6 floor có nhiều slot nhất để tránh vỡ Dashboard.
// Label: "<floor.name>" – unique theo floor_id, không phải tên.
// Trả về [{ floorId, floorName, totalSlots, occupiedSlots, percentage }]
export async function fetchFloorOccupancy() {
    try {
        // Lấy tất cả slot kèm theo area → floor
        // Scope GLOBAL (toàn hệ thống), nhất quán với availableSlots / occupiedSlots
        const { data, error } = await supabase
            .from('slot')
            .select(`
                slot_id,
                status,
                area:area_id (
                    area_id,
                    floor:floor_id (
                        floor_id,
                        floor_number,
                        name,
                        parking:parking_id (
                            name
                        )
                    )
                )
            `);
        if (error) throw error;

        // Group theo floor_id (UUID) – đảm bảo không trùng dòng
        const floorMap = new Map();
        (data ?? []).forEach((slot) => {
            const floor = slot.area?.floor;
            if (!floor?.floor_id) return;
            const key = floor.floor_id; // UUID duy nhất

            if (!floorMap.has(key)) {
                // Label ngắn gọn: "Floor 1" không đủ unique khi nhiều parking
                // → dùng parking.name + floor.name nếu available
                const parkingName = floor.parking?.name || '';
                // Rút gọn tên parking cho dễ đọc: lấy phần sau dấu " - " cuối cùng
                const shortParking = parkingName.includes(' - ')
                    ? parkingName.split(' - ').pop()
                    : parkingName;
                const label = shortParking
                    ? `${shortParking} / ${floor.name || `Tầng ${floor.floor_number}`}`
                    : (floor.name || `Tầng ${floor.floor_number}`);

                floorMap.set(key, {
                    floorId: floor.floor_id,
                    floorName: label,
                    totalSlots: 0,
                    occupiedSlots: 0,
                });
            }
            const entry = floorMap.get(key);
            entry.totalSlots++;
            if (slot.status === 'Đang sử dụng') entry.occupiedSlots++;
        });

        // Nếu không có slot nào status Đang sử dụng, thử fallback từ parking_order
        const hasOccupied = [...floorMap.values()].some((f) => f.occupiedSlots > 0);
        if (!hasOccupied) {
            const { data: orderData, error: orderErr } = await supabase
                .from('parking_order')
                .select('slot_id')
                .eq('status', 'Đang gửi xe')
                .not('slot_id', 'is', null);

            if (!orderErr && (orderData ?? []).length > 0) {
                const activeSlotIds = new Set(orderData.map((r) => r.slot_id));
                (data ?? []).forEach((slot) => {
                    const floor = slot.area?.floor;
                    if (!floor?.floor_id) return;
                    if (activeSlotIds.has(slot.slot_id)) {
                        floorMap.get(floor.floor_id).occupiedSlots++;
                    }
                });
            }
        }

        const allFloors = [...floorMap.values()].map((f) => ({
            ...f,
            percentage: f.totalSlots > 0 ? Math.round((f.occupiedSlots / f.totalSlots) * 100) : 0,
        }));

        // Giới hạn top 6 floor có nhiều slot nhất để tránh danh sách quá dài
        // TODO: thay bằng filter theo parking_id cụ thể khi có yêu cầu chọn parking
        allFloors.sort((a, b) => b.totalSlots - a.totalSlots);
        return allFloors.slice(0, 6);
    } catch (err) {
        console.error('[Dashboard] fetchFloorOccupancy:', err.message);
        return [];
    }
}

// ─── 9. Phân loại phương tiện đang trong bãi ─────────────────────────────────
// Ưu tiên: parking_order status='Đang gửi xe' → vehicle → vehicle_type
// Fallback: parking_sessions status='Đang gửi xe' → vehicle → vehicle_type
// Trả về [{ vehicleTypeName, count, percentage, color }]
export async function fetchVehicleTypeDistribution() {
    try {
        // Thử parking_order trước
        const { data: orderData, error: orderErr } = await supabase
            .from('parking_order')
            .select(`
                vehicle:vehicle_id (
                    vehicle_type:vehicle_type_id (
                        name
                    )
                )
            `)
            .eq('status', 'Đang gửi xe');

        let sourceData = null;
        if (!orderErr && orderData && orderData.length > 0) {
            sourceData = orderData;
        } else {
            // Fallback parking_sessions
            const { data: sessData, error: sessErr } = await supabase
                .from('parking_sessions')
                .select(`
                    vehicle:vehicle_id (
                        vehicle_type:vehicle_type_id (
                            name
                        )
                    )
                `)
                .eq('status', 'Đang gửi xe');
            if (sessErr) throw sessErr;
            sourceData = sessData;
        }

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
            // TODO: replace with real database field when available (vehicle_type không có cột color)
            color: VEHICLE_TYPE_COLOR_MAP[vehicleTypeName] ?? VEHICLE_TYPE_COLOR_DEFAULT,
        }));
    } catch (err) {
        console.error('[Dashboard] fetchVehicleTypeDistribution:', err.message);
        return [];
    }
}

// ─── 10. Xe vào gần đây ──────────────────────────────────────────────────────
// Ưu tiên: entry_exit_log direction='Xe vào', join session → slot để lấy slot_code
// Fallback: parking_sessions order by entry_time desc limit 5
// Trả về [{ id, plate, slot, time }] – dedupe theo id
export async function fetchRecentEntries() {
    try {
        // Thử entry_exit_log trước, kèm session_id để lookup slot
        const { data: logData, error: logErr } = await supabase
            .from('entry_exit_log')
            .select('log_id, plate_number, event_time, session_id')
            .eq('direction', 'Xe vào')
            .order('event_time', { ascending: false })
            .limit(5);

        if (!logErr && logData && logData.length > 0) {
            // Dedupe theo log_id
            const seen = new Set();
            const unique = logData.filter((r) => {
                if (seen.has(r.log_id)) return false;
                seen.add(r.log_id);
                return true;
            });

            // Thử lấy slot_code từ parking_sessions qua session_id
            // entry_exit_log.session_id → parking_sessions (không có slot FK trực tiếp)
            // TODO: replace with real database field when available – parking_sessions chưa có FK slot
            return unique.map((row) => ({
                id: row.log_id,
                plate: row.plate_number || '—',
                slot: '—',
                time: formatHHmm(row.event_time),
            }));
        }

        // Fallback: parking_sessions
        const { data: sessData, error: sessErr } = await supabase
            .from('parking_sessions')
            .select('session_id, plate_number, entry_time')
            .order('entry_time', { ascending: false })
            .limit(5);
        if (sessErr) throw sessErr;

        // Dedupe theo session_id
        const seenSess = new Set();
        return (sessData ?? []).filter((r) => {
            if (seenSess.has(r.session_id)) return false;
            seenSess.add(r.session_id);
            return true;
        }).map((row) => ({
            id: row.session_id,
            plate: row.plate_number || '—',
            slot: '—', // TODO: replace with real database field when available – parking_sessions không có FK slot trực tiếp
            time: formatHHmm(row.entry_time),
        }));
    } catch (err) {
        console.error('[Dashboard] fetchRecentEntries:', err.message);
        return [];
    }
}

// ─── 11. Xe ra gần đây ───────────────────────────────────────────────────────
// Ưu tiên: entry_exit_log direction='Xe ra' order by event_time desc limit 5
// Fallback: parking_sessions where exit_time is not null order by exit_time desc limit 5
// Trả về [{ id, plate, slot, time }] – dedupe theo id
export async function fetchRecentExits() {
    try {
        // Thử entry_exit_log trước
        const { data: logData, error: logErr } = await supabase
            .from('entry_exit_log')
            .select('log_id, plate_number, event_time')
            .eq('direction', 'Xe ra')
            .order('event_time', { ascending: false })
            .limit(5);

        if (!logErr && logData && logData.length > 0) {
            // Dedupe theo log_id
            const seen = new Set();
            return logData.filter((r) => {
                if (seen.has(r.log_id)) return false;
                seen.add(r.log_id);
                return true;
            }).map((row) => ({
                id: row.log_id,
                plate: row.plate_number || '—',
                slot: '—', // TODO: replace with real database field when available
                time: formatHHmm(row.event_time),
            }));
        }

        // Fallback: parking_sessions exit_time not null
        const { data: sessData, error: sessErr } = await supabase
            .from('parking_sessions')
            .select('session_id, plate_number, exit_time')
            .not('exit_time', 'is', null)
            .order('exit_time', { ascending: false })
            .limit(5);
        if (sessErr) throw sessErr;

        // Dedupe theo session_id
        const seenSess = new Set();
        return (sessData ?? []).filter((r) => {
            if (seenSess.has(r.session_id)) return false;
            seenSess.add(r.session_id);
            return true;
        }).map((row) => ({
            id: row.session_id,
            plate: row.plate_number || '—',
            slot: '—', // TODO: replace with real database field when available
            time: formatHHmm(row.exit_time),
        }));
    } catch (err) {
        console.error('[Dashboard] fetchRecentExits:', err.message);
        return [];
    }
}

// ─── 12. Sự cố gần đây ───────────────────────────────────────────────────────
// Ưu tiên: card_lost_log order by reported_at desc limit 5 (join vehicle nếu có)
// Kết hợp: incident_report order by created_at desc limit 5 (join parking_order → vehicle)
// Trả về [{ id, identifier, type, status, statusClass }]
export async function fetchRecentIncidents() {
    try {
        const results = [];

        // Lấy card_lost_log
        const { data: lostData, error: lostErr } = await supabase
            .from('card_lost_log')
            .select(`
                lost_report_id,
                status,
                reported_at,
                vehicle:vehicle_id (
                    plate_number
                )
            `)
            .order('reported_at', { ascending: false })
            .limit(5);

        if (lostErr) {
            console.warn('[Dashboard] card_lost_log fetch:', lostErr.message);
        } else {
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
        }

        // Lấy incident_report
        const { data: incData, error: incErr } = await supabase
            .from('incident_report')
            .select(`
                incident_id,
                incident_type,
                status,
                created_at,
                parking_order:parking_order_id (
                    vehicle:vehicle_id (
                        plate_number
                    ),
                    card:card_id (
                        code
                    )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        if (incErr) {
            console.warn('[Dashboard] incident_report fetch:', incErr.message);
        } else {
            (incData ?? []).forEach((row) => {
                const plate = row.parking_order?.vehicle?.plate_number;
                const cardCode = row.parking_order?.card?.code;
                results.push({
                    id: row.incident_id,
                    identifier: plate || cardCode || `INC-${row.incident_id.slice(0, 8)}`,
                    type: (row.incident_type || '—').toUpperCase(),
                    status: (row.status || '—').toUpperCase(),
                    statusClass: resolveIncidentStatusClass(row.status),
                    sortTime: row.created_at,
                });
            });
        }

        // Sort tổng hợp mới nhất lên đầu, lấy 5
        results.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));

        // Dedupe theo id
        const seen = new Set();
        return results.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        }).slice(0, 5);
    } catch (err) {
        console.error('[Dashboard] fetchRecentIncidents:', err.message);
        return [];
    }
}

/** Map status string → CSS class badge */
function resolveIncidentStatusClass(status) {
    if (!status) return 'db-badge--waiting';
    const s = status.toLowerCase();
    if (s.includes('hoàn thành') || s.includes('đã xử lý') || s.includes('xong')) return 'db-badge--done';
    return 'db-badge--waiting';
}

// ─── Master fetch – load tất cả, occupiedSlots cần activeSessions làm fallback ──
export async function fetchAllDashboardData() {
    // activeSessions phải load trước để truyền vào fetchOccupiedSlots làm fallback
    const activeSessions = await fetchActiveSessions();

    const [
        availableSlots,
        occupiedSlots,
        todayIncidents,
        todayRevenue,
        monthRevenue,
        hourlyTraffic,
        floorOccupancy,
        vehicleTypeDistribution,
        recentEntries,
        recentExits,
        recentIncidents,
        todayTotalRevenue,
        monthTotalRevenue,
        todayCasualRevenue,
        monthCasualRevenue,
        todayMonthlyRevenue,
        monthMonthlyRevenue,
        monthlyNewCount,
        monthlyRenewCount,
    ] = await Promise.all([
        fetchAvailableSlots(),
        fetchOccupiedSlots(activeSessions), // truyền activeSessions làm fallback
        fetchTodayIncidents(),
        fetchTodayRevenue(),
        fetchMonthRevenue(),
        fetchHourlyTraffic(),
        fetchFloorOccupancy(),
        fetchVehicleTypeDistribution(),
        fetchRecentEntries(),
        fetchRecentExits(),
        fetchRecentIncidents(),
        fetchTodayTotalRevenue(),
        fetchMonthTotalRevenue(),
        fetchTodayCasualRevenue(),
        fetchMonthCasualRevenue(),
        fetchTodayMonthlyRevenue(),
        fetchMonthMonthlyRevenue(),
        fetchMonthlyNewCount(),
        fetchMonthlyRenewCount(),
    ]);

    return {
        activeSessions,
        availableSlots,
        occupiedSlots,
        todayIncidents,
        todayRevenue,
        monthRevenue,
        hourlyTraffic,
        floorOccupancy,
        vehicleTypeDistribution,
        recentEntries,
        recentExits,
        recentIncidents,
        todayTotalRevenue,
        monthTotalRevenue,
        todayCasualRevenue,
        monthCasualRevenue,
        todayMonthlyRevenue,
        monthMonthlyRevenue,
        monthlyNewCount,
        monthlyRenewCount,
    };
}
