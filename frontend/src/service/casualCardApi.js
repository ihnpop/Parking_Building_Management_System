/**
 * casualCardApi.js
 * Gọi Backend API cho Nhật ký thẻ lượt (khách vãng lai).
 *
 * Endpoints:
 *   GET /api/casual-card/sessions → danh sách phiên (đã map sang row bảng)
 *   GET /api/casual-card/revenue  → { total: number } tổng doanh thu
 */

import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Tự động gắn Supabase token vào mỗi request
API.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (err) {
        console.warn("[casualCardApi] Could not get Supabase session:", err.message);
    }
    return config;
});

// ─── Helpers format (dùng ở frontend khi cần hiển thị) ───────────────────────

/** Format datetime sang "DD/MM/YYYY, HH:mm" theo timezone Việt Nam */
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

export function formatDateTimeVNSplit(dateValue) {
    if (!dateValue) return null;
    try {
        let val = dateValue;
        if (typeof val === 'string') {
            val = val.trim().replace(' ', 'T');
            const hasTimezone = val.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(val);
            if (!hasTimezone && val.includes('T')) val = val + 'Z';
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;

        const time = new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        const date = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        return { time, date };
    } catch {
        return null;
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

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách nhật ký thẻ lượt (đã map sang row bảng từ backend).
 * @returns {Promise<Array>}
 */
export async function getCasualCardSessions() {
    const response = await API.get("/casual-card/sessions");
    return response.data;
}

/**
 * Lấy tổng doanh thu thẻ lượt.
 * @returns {Promise<number>}
 */
export async function getCasualTotalRevenue() {
    const response = await API.get("/casual-card/revenue");
    return response.data.total;
}

/**
 * Map session row sang định dạng bảng (giữ để tương thích nếu cần dùng local).
 * Lưu ý: backend đã map sẵn, hàm này chỉ là helper phòng hờ.
 */
export function mapSessionToRow(session) {
    const isMonthlySession = session.ticket_type === 'Thẻ tháng' ||
        session.card_type === 'Thẻ tháng' ||
        session.card?.card_type === 'Thẻ tháng' ||
        session.card?.type === 'MONTHLY' ||
        session.is_monthly === true;

    const paymentList = Array.isArray(session.payment) ? session.payment : (session.payment ? [session.payment] : []);
    const lostCardPayment = paymentList.find(p =>
        p.payment_type === 'Phí mất thẻ lượt' ||
        (p.payment_type && p.payment_type.toLowerCase().includes('mất thẻ'))
    );
    const isLostCard = !!lostCardPayment ||
        session.status === 'Mất thẻ' ||
        session.status === 'Thẻ đã cấp lại' ||
        session.is_lost_card === true ||
        !!session.lost_report_id;

    // Tách biệt hoàn toàn trạng thái phiên báo mất thành "Mất thẻ"
    let status = session.status || '---';
    if (isLostCard || status === 'Thẻ đã cấp lại') {
        status = 'Mất thẻ';
    }

    const effectivePayment = lostCardPayment || paymentList[0] || null;
    
    // Tính tổng tiền phiên: Nếu là mất thẻ lượt, chỉ lấy phần Phí gửi xe (parkingFee) trong payload note, KHÔNG cộng gộp phí phạt mất thẻ
    let actualFee = 0;
    if (lostCardPayment) {
        let noteObj = lostCardPayment.note;
        if (typeof noteObj === 'string') {
            try { noteObj = JSON.parse(noteObj); } catch(e) {}
        }
        actualFee = noteObj?.parkingFee ?? session.final_fee ?? session.estimated_fee ?? 0;
    } else if (paymentList.length > 0) {
        actualFee = paymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
        actualFee = session.final_fee ?? session.fee ?? session.estimated_fee ?? 0;
    }

    return {
        session_id: session.session_id || '',
        cardCode: session.cardCode || session.card?.code || '---',
        plate: session.plate || session.plate_number || '---',
        vehicleType: session.vehicleType || session.vehicle?.vehicle_type?.name || '---',
        entryTime: session.entryTime || session.entry_time || null,
        exitTime: session.exitTime || session.exit_time || null,
        entryTimeDisplay: session.entryTimeDisplay || formatDateTimeVN(session.entry_time || session.entryTime),
        exitTimeDisplay: session.exitTimeDisplay || formatDateTimeVN(session.exit_time || session.exitTime),
        entryTimeSplit: session.entryTimeSplit || formatDateTimeVNSplit(session.entry_time || session.entryTime),
        exitTimeSplit: session.exitTimeSplit || formatDateTimeVNSplit(session.exit_time || session.exitTime),
        duration: session.duration || computeDuration(session.entry_time || session.entryTime, session.exit_time || session.exitTime),
        fee: actualFee,
        feeDisplay: formatCasualVND(actualFee),
        paymentMethod: session.paymentMethod || effectivePayment?.payment_method || 'Tiền mặt',
        paymentInfo: effectivePayment || session.paymentInfo || session.payment || null,
        isLostCardSession: isLostCard,
        isMonthlySession: isMonthlySession,
        status: status,
        entryGate: session.entryGate || session.entry_gate?.name || '---',
        exitGate: session.exitGate || session.exit_gate?.name || '---',
        staffIn: session.staffIn || session.staff_in?.full_name || '---',
    };
}
