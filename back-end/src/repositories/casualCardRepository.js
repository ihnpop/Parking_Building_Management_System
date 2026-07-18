/**
 * casualCardRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho Nhật ký thẻ lượt (khách vãng lai).
 * Làm việc trực tiếp với Supabase Client.
 */

import supabase from "../config/supabaseClient.js";

/**
 * Lấy danh sách phiên gửi xe (parking_sessions) kèm thông tin card, vehicle, staff, gate.
 * Lọc client-side: chỉ lấy phiên có card type = 'Thẻ lượt'.
 */
export async function getCasualCardSessions(limit = 1000) {
    const { data: sessions, error: sessionsErr } = await supabase
        .from('parking_sessions')
        .select('session_id, plate_number, entry_time, exit_time, final_fee, estimated_fee, status, card_id, vehicle_id, staff_in_id, entry_gate_id, exit_gate_id')
        .order('entry_time', { ascending: false })
        .limit(limit);

    if (sessionsErr) throw sessionsErr;
    if (!sessions || sessions.length === 0) return [];

    // Parallel lookups
    const cardIds    = [...new Set(sessions.map(s => s.card_id).filter(Boolean))];
    const vehicleIds = [...new Set(sessions.map(s => s.vehicle_id).filter(Boolean))];
    const staffIds   = [...new Set(sessions.map(s => s.staff_in_id).filter(Boolean))];
    const gateIds    = [...new Set([...sessions.map(s => s.entry_gate_id), ...sessions.map(s => s.exit_gate_id)].filter(Boolean))];

    const [cardsRes, vehiclesRes, staffRes, gatesRes] = await Promise.all([
        cardIds.length > 0
            ? supabase.from('card').select('card_id, code, type').in('card_id', cardIds)
            : { data: [] },
        vehicleIds.length > 0
            ? supabase.from('vehicle').select('vehicle_id, vehicle_type:vehicle_type_id(name)').in('vehicle_id', vehicleIds)
            : { data: [] },
        staffIds.length > 0
            ? supabase.from('profiles').select('id, full_name').in('id', staffIds)
            : { data: [] },
        gateIds.length > 0
            ? supabase.from('gate').select('gate_id, name').in('gate_id', gateIds)
            : { data: [] },
    ]);

    const cardsMap   = Object.fromEntries((cardsRes.data   || []).map(c  => [c.card_id,   c]));
    const vehiclesMap= Object.fromEntries((vehiclesRes.data|| []).map(v  => [v.vehicle_id, v]));
    const staffMap   = Object.fromEntries((staffRes.data   || []).map(st => [st.id,        st]));
    const gatesMap   = Object.fromEntries((gatesRes.data   || []).map(g  => [g.gate_id,    g]));

    return sessions
        .map(s => ({
            ...s,
            card:       s.card_id       ? cardsMap[s.card_id]       : null,
            vehicle:    s.vehicle_id    ? vehiclesMap[s.vehicle_id]  : null,
            staff_in:   s.staff_in_id   ? staffMap[s.staff_in_id]    : null,
            entry_gate: s.entry_gate_id ? gatesMap[s.entry_gate_id]  : null,
            exit_gate:  s.exit_gate_id  ? gatesMap[s.exit_gate_id]   : null,
        }))
        // Lọc: chỉ giữ phiên có thẻ lượt
        .filter(s => s.card?.type === 'Thẻ lượt');
}

/**
 * Lấy tổng doanh thu thẻ lượt
 * Nguồn: payment WHERE payment_type = 'Vé lượt' AND status = 'Đã thanh toán'
 */
export async function getCasualTotalRevenue() {
    const { data, error } = await supabase
        .from('payment')
        .select('amount')
        .eq('status', 'Đã thanh toán')
        .eq('payment_type', 'Vé lượt');

    if (error) throw error;
    return (data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}
