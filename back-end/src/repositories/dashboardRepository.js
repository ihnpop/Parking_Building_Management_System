/**
 * dashboardRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho Dashboard.
 * Làm việc trực tiếp với Supabase Client để truy vấn dữ liệu từ các bảng thực tế.
 */

import supabase from "../config/supabaseClient.js";

/** Lấy số lượng phiên đang đỗ xe (active sessions) */
export async function getActiveSessionsCount() {
    const { count, error } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Đang gửi xe');
    if (error) throw error;
    return count ?? 0;
}

/** Đếm số chỗ trống khả dụng (chỉ đếm trạng thái 'Sẵn sàng') */
export async function getAvailableSlotsCount(buildingId = null) {
    if (!buildingId) {
        const { count, error } = await supabase
            .from('slot')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Sẵn sàng');
        if (error) throw error;
        return count ?? 0;
    }

    const { count, error } = await supabase
        .from('slot')
        .select('slot_id, area!inner(floor!inner(parking!inner(building_id)))', { count: 'exact', head: true })
        .eq('status', 'Sẵn sàng')
        .eq('area.floor.parking.building_id', buildingId);

    if (error) throw error;
    return count ?? 0;
}

/** Đếm số chỗ đang sử dụng (status = 'Đang dùng' hoặc 'Đang sử dụng') */
export async function getOccupiedSlotsCountRaw(buildingId = null) {
    if (!buildingId) {
        const { count, error } = await supabase
            .from('slot')
            .select('*', { count: 'exact', head: true })
            .in('status', ['Đang dùng', 'Đang sử dụng']);
        if (error) throw error;
        return count ?? 0;
    }

    const { count, error } = await supabase
        .from('slot')
        .select('slot_id, area!inner(floor!inner(parking!inner(building_id)))', { count: 'exact', head: true })
        .in('status', ['Đang dùng', 'Đang sử dụng'])
        .eq('area.floor.parking.building_id', buildingId);

    if (error) throw error;
    return count ?? 0;
}

/** Lấy danh sách slot_id từ parking_sessions đang hoạt động */
export async function getActiveSessionSlots() {
    const { data, error } = await supabase
        .from('parking_sessions')
        .select('slot_id')
        .eq('status', 'Đang gửi xe')
        .not('slot_id', 'is', null);
    if (error) throw error;
    return data;
}

/** Lấy danh sách session_id từ parking_sessions có status 'Đang gửi xe' */
export async function getActiveSessionsCountRaw() {
    const { data, error } = await supabase
        .from('parking_sessions')
        .select('session_id')
        .eq('status', 'Đang gửi xe');
    if (error) throw error;
    return data;
}

/** Lấy số lượng sự cố xảy ra trong một khoảng thời gian (start, end) */
export async function getTodayIncidentsCounts(start, end, buildingId = null) {
    let query = supabase
        .from('card_lost_log')
        .select('*', { count: 'exact', head: true })
        .gte('reported_at', start)
        .lte('reported_at', end);

    if (buildingId) {
        query = query.eq('building_id', buildingId);
    }

    const lostRes = await query;
    if (lostRes.error) throw lostRes.error;

    return {
        lostCount: lostRes.count ?? 0,
        incidentCount: 0
    };
}

/** Lấy danh sách hóa đơn đã thanh toán trong một khoảng thời gian (start, end) */
export async function getPaymentsInPeriod(start, end, buildingId = null) {
    if (!buildingId) {
        const { data, error } = await supabase
            .from('payment')
            .select('payment_id, amount, payment_type, payment_time, session_id, vehicle_package_id, status')
            .eq('status', 'Đã thanh toán')
            .gte('payment_time', start)
            .lte('payment_time', end);
        if (error) throw error;
        return data;
    }

    const { data: logs } = await supabase
        .from('entry_exit_log')
        .select('session_id')
        .eq('building_id', buildingId);

    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];

    const { data, error } = await supabase
        .from('payment')
        .select('payment_id, amount, payment_type, payment_time, session_id, vehicle_package_id, status')
        .eq('status', 'Đã thanh toán')
        .in('session_id', sessionIds)
        .gte('payment_time', start)
        .lte('payment_time', end);

    if (error) throw error;
    return data;
}

/** Lấy tên loại xe dựa trên sessionIds */
export async function getSessionsVehicleTypes(sessionIds) {
    const { data, error } = await supabase
        .from('parking_sessions')
        .select('session_id, vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))')
        .in('session_id', sessionIds);
    if (error) throw error;
    return data;
}

/** Lấy thông tin gói cước và loại xe dựa trên vpIds */
export async function getVehiclePackagesDetails(vpIds) {
    const { data, error } = await supabase
        .from('vehicle_package')
        .select('vehicle_package_id, package:package_id(package_name, duration_month, vehicle_type:vehicle_type_id(type_name)), vehicle:vehicle_id(vehicle_type:vehicle_type_id(type_name))')
        .in('vehicle_package_id', vpIds);
    if (error) throw error;
    return data;
}

/** Lấy sự kiện xe vào phục vụ lưu lượng theo giờ */
export async function getHourlyTrafficLogs(start, end, buildingId = null) {
    let query = supabase
        .from('entry_exit_log')
        .select('event_time')
        .eq('direction', 'Xe vào')
        .gte('event_time', start)
        .lte('event_time', end);

    if (buildingId) {
        query = query.eq('building_id', buildingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/** Lấy entry_time phục vụ lưu lượng theo giờ fallback */
export async function getHourlyTrafficSessions(start, end, buildingId = null) {
    if (!buildingId) {
        const { data, error } = await supabase
            .from('parking_sessions')
            .select('entry_time')
            .gte('entry_time', start)
            .lte('entry_time', end);
        if (error) throw error;
        return data;
    }

    const { data: logs } = await supabase
        .from('entry_exit_log')
        .select('session_id')
        .eq('building_id', buildingId);

    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];

    const { data, error } = await supabase
        .from('parking_sessions')
        .select('entry_time')
        .in('session_id', sessionIds)
        .gte('entry_time', start)
        .lte('entry_time', end);

    if (error) throw error;
    return data;
}

/** Lấy danh sách slots kèm theo thông tin tầng phục vụ tính occupancy tầng */
export async function getSlotsWithFloors(buildingId = null) {
    let query = supabase
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
                        building_id,
                        name
                    )
                )
            )
        `);

    if (buildingId) {
        query = query.eq('area.floor.parking.building_id', buildingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/** Lấy thông tin loại xe đang gửi trong bãi qua parking_sessions */
export async function getActiveSessionsVehicles(buildingId = null) {
    if (!buildingId) {
        const { data, error } = await supabase
            .from('parking_sessions')
            .select(`
                vehicle:vehicle_id (
                    vehicle_type:vehicle_type_id (
                        name
                    )
                )
            `)
            .eq('status', 'Đang gửi xe');
        if (error) throw error;
        return data;
    }

    const { data: logs } = await supabase
        .from('entry_exit_log')
        .select('session_id')
        .eq('building_id', buildingId)
        .eq('direction', 'Xe vào');

    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];

    const { data, error } = await supabase
        .from('parking_sessions')
        .select(`
            vehicle:vehicle_id (
                vehicle_type:vehicle_type_id (
                    name
                )
            )
        `)
        .eq('status', 'Đang gửi xe')
        .in('session_id', sessionIds);

    if (error) throw error;
    return data;
}

/** Lấy 5 lượt xe vào mới nhất từ entry_exit_log */
export async function getRecentEntryLogs(buildingId = null, limit = 5) {
    let query = supabase
        .from('entry_exit_log')
        .select(`
            log_id,
            plate_number,
            event_time,
            session_id,
            session:session_id (
                slot:slot_id (
                    slot_code
                )
            )
        `)
        .eq('direction', 'Xe vào')
        .order('event_time', { ascending: false })
        .limit(limit);

    if (buildingId) {
        query = query.eq('building_id', buildingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/** Lấy 5 phiên xe vào mới nhất phục vụ fallback */
export async function getRecentEntrySessions(buildingId = null, limit = 5) {
    if (!buildingId) {
        const { data, error } = await supabase
            .from('parking_sessions')
            .select(`
                session_id,
                plate_number,
                entry_time,
                slot:slot_id (
                    slot_code
                )
            `)
            .order('entry_time', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    const { data: logs } = await supabase
        .from('entry_exit_log')
        .select('session_id')
        .eq('building_id', buildingId);

    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];

    const { data, error } = await supabase
        .from('parking_sessions')
        .select(`
            session_id,
            plate_number,
            entry_time,
            slot:slot_id (
                slot_code
            )
        `)
        .in('session_id', sessionIds)
        .order('entry_time', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

/** Lấy 5 lượt xe ra mới nhất từ entry_exit_log */
export async function getRecentExitLogs(buildingId = null, limit = 5) {
    let query = supabase
        .from('entry_exit_log')
        .select(`
            log_id,
            plate_number,
            event_time,
            session_id,
            session:session_id (
                slot:slot_id (
                    slot_code
                )
            )
        `)
        .eq('direction', 'Xe ra')
        .order('event_time', { ascending: false })
        .limit(limit);

    if (buildingId) {
        query = query.eq('building_id', buildingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/** Lấy 5 phiên xe ra mới nhất phục vụ fallback */
export async function getRecentExitSessions(buildingId = null, limit = 5) {
    if (!buildingId) {
        const { data, error } = await supabase
            .from('parking_sessions')
            .select(`
                session_id,
                plate_number,
                exit_time,
                slot:slot_id (
                    slot_code
                )
            `)
            .not('exit_time', 'is', null)
            .order('exit_time', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    const { data: logs } = await supabase
        .from('entry_exit_log')
        .select('session_id')
        .eq('building_id', buildingId);

    const sessionIds = [...new Set((logs || []).map(l => l.session_id).filter(Boolean))];

    const { data, error } = await supabase
        .from('parking_sessions')
        .select(`
            session_id,
            plate_number,
            exit_time,
            slot:slot_id (
                slot_code
            )
        `)
        .in('session_id', sessionIds)
        .not('exit_time', 'is', null)
        .order('exit_time', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

/** Lấy 5 báo mất thẻ mới nhất */
export async function getRecentLostCards(buildingId = null, limit = 5) {
    let query = supabase
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
        .limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/** Lấy 5 báo cáo sự cố mới nhất */
export async function getRecentIncidentReports(buildingId = null, limit = 5) {
    return [];
}