/**
 * casualCardApi.js
 * Service Supabase cho Nhật ký thẻ lượt (khách vãng lai).
 *
 * Nguồn dữ liệu chính:
 *   - parking_sessions: phiên gửi xe của thẻ lượt
 *   - card: lọc type = 'Thẻ lượt'
 *   - payment: payment_type = 'Vé lượt' → doanh thu
 *   - vehicle + vehicle_type: loại xe
 *   - profiles (staff_in): nhân viên xử lý
 *   - gate: cổng vào/ra
 *
 * Không sửa backend, không hardcode, không fake data.
 */

import supabase from '../config/supabaseClient';

// ─── Helpers format ────────────────────────────────────────────────────────────

/** Format datetime sang "HH:mm DD/MM/YYYY" theo timezone Việt Nam */
export function formatDateTimeVN(dateValue) {
    if (!dateValue) return '---';
    try {
        let val = dateValue;
        if (typeof val === 'string') {
            val = val.trim().replace(' ', 'T');
            const hasTimezone = val.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(val);
            if (!hasTimezone && val.includes('T')) val = val + 'Z';
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return '---';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
    } catch {
        return '---';
    }
}

/** Tính thời gian gửi xe (entry → exit) */
export function computeDuration(entryTime, exitTime) {
    if (!entryTime || !exitTime) return '---';
    try {
        const entry = new Date(entryTime);
        const exit = new Date(exitTime);
        const diffMs = exit - entry;
        if (diffMs < 0) return '---';
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0 && minutes > 0) return `${hours}g ${minutes}p`;
        if (hours > 0) return `${hours} giờ`;
        return `${minutes} phút`;
    } catch {
        return '---';
    }
}

/** Format tiền VND */
export function formatCasualVND(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(num);
}

// ─── 1. Lấy danh sách phiên gửi xe thẻ lượt ──────────────────────────────────
// Nguồn: parking_sessions JOIN card (type = 'Thẻ lượt')
// JOIN vehicle → vehicle_type, staff_in → profiles, entry_gate/exit_gate → gate
export async function getCasualCardSessions() {
    try {
        const { data: sessions, error: sessionsErr } = await supabase
            .from('parking_sessions')
            .select('session_id, plate_number, entry_time, exit_time, final_fee, estimated_fee, status, card_id, vehicle_id, staff_in_id, entry_gate_id, exit_gate_id')
            .order('entry_time', { ascending: false })
            .limit(1000);

        if (sessionsErr) throw sessionsErr;
        if (!sessions || sessions.length === 0) return [];

        // Parallel lookups
        const cardIds = [...new Set(sessions.map(s => s.card_id).filter(Boolean))];
        const vehicleIds = [...new Set(sessions.map(s => s.vehicle_id).filter(Boolean))];
        const staffIds = [...new Set(sessions.map(s => s.staff_in_id).filter(Boolean))];
        const gateIds = [...new Set([...sessions.map(s => s.entry_gate_id), ...sessions.map(s => s.exit_gate_id)].filter(Boolean))];

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
                : { data: [] }
        ]);

        const cardsMap = {};
        (cardsRes.data || []).forEach(c => {
            cardsMap[c.card_id] = c;
        });

        const vehiclesMap = {};
        (vehiclesRes.data || []).forEach(v => {
            vehiclesMap[v.vehicle_id] = v;
        });

        const staffMap = {};
        (staffRes.data || []).forEach(st => {
            staffMap[st.id] = st;
        });

        const gatesMap = {};
        (gatesRes.data || []).forEach(g => {
            gatesMap[g.gate_id] = g;
        });

        const mappedSessions = sessions
            .map(s => {
                const card = s.card_id ? cardsMap[s.card_id] : null;
                const vehicle = s.vehicle_id ? vehiclesMap[s.vehicle_id] : null;
                const staff_in = s.staff_in_id ? staffMap[s.staff_in_id] : null;
                const entry_gate = s.entry_gate_id ? gatesMap[s.entry_gate_id] : null;
                const exit_gate = s.exit_gate_id ? gatesMap[s.exit_gate_id] : null;

                return {
                    ...s,
                    card,
                    vehicle,
                    staff_in,
                    entry_gate,
                    exit_gate
                };
            })
            // Lọc client-side: chỉ lấy phiên có thẻ lượt
            .filter(s => s.card?.type === 'Thẻ lượt');

        return mappedSessions;
    } catch (err) {
        console.error('[CasualCardLog] getCasualCardSessions:', err.message || err);
        return [];
    }
}

// ─── 2. Doanh thu thẻ lượt ────────────────────────────────────────────────────
// Nguồn: payment WHERE payment_type = 'Vé lượt' AND status = 'Đã thanh toán'
export async function getCasualTotalRevenue() {
    try {
        const { data, error } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Đã thanh toán')
            .eq('payment_type', 'Vé lượt');

        if (error) throw error;
        return (data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    } catch (err) {
        console.error('[CasualCardLog] getCasualTotalRevenue:', err.message || err);
        return 0;
    }
}

// ─── 3. Map session → row hiển thị cho bảng ──────────────────────────────────
export function mapSessionToRow(session) {
    return {
        session_id: session.session_id || '',
        cardCode: session.card?.code || '---',
        plate: session.plate_number || '---',
        vehicleType: session.vehicle?.vehicle_type?.name || '---',
        entryTime: session.entry_time || null,
        exitTime: session.exit_time || null,
        entryTimeDisplay: formatDateTimeVN(session.entry_time),
        exitTimeDisplay: formatDateTimeVN(session.exit_time),
        duration: computeDuration(session.entry_time, session.exit_time),
        fee: session.final_fee ?? session.estimated_fee ?? null,
        feeDisplay: session.exit_time
            ? formatCasualVND(session.final_fee ?? session.estimated_fee)
            : (session.estimated_fee ? formatCasualVND(session.estimated_fee) + ' (ước tính)' : '---'),
        status: session.status || '---',
        entryGate: session.entry_gate?.name || '---',
        exitGate: session.exit_gate?.name || '---',
        staffIn: session.staff_in?.full_name || '---',
    };
}
