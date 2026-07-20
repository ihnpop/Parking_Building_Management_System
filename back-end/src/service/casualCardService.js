/**
 * casualCardService.js
 * Tầng xử lý nghiệp vụ (Service) cho Nhật ký thẻ lượt (khách vãng lai).
 */

import * as casualCardRepository from "../repositories/casualCardRepository.js";

// ─── Helpers format ────────────────────────────────────────────────────────────

/** Format datetime sang "DD/MM/YYYY, HH:mm" theo timezone Việt Nam */
function formatDateTimeVN(dateValue) {
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

function formatDateTimeVNSplit(dateValue) {
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
function computeDuration(entryTime, exitTime) {
    if (!entryTime || !exitTime) return '---';
    try {
        const entry = new Date(entryTime);
        const exit  = new Date(exitTime);
        const diffMs = exit - entry;
        if (diffMs < 0) return '---';
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours   = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0 && minutes > 0) return `${hours}g ${minutes}p`;
        if (hours > 0) return `${hours} giờ`;
        return `${minutes} phút`;
    } catch {
        return '---';
    }
}

/** Format tiền VND */
function formatCasualVND(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(num);
}

/** Map 1 session object → row hiển thị cho bảng */
function mapSessionToRow(session) {
    return {
        session_id:       session.session_id || '',
        cardCode:         session.card?.code || '---',
        plate:            session.plate_number || '---',
        vehicleType:      session.vehicle?.vehicle_type?.name || '---',
        entryTime:        session.entry_time || null,
        exitTime:         session.exit_time  || null,
        entryTimeDisplay: formatDateTimeVN(session.entry_time),
        exitTimeDisplay:  formatDateTimeVN(session.exit_time),
        entryTimeSplit:   formatDateTimeVNSplit(session.entry_time),
        exitTimeSplit:    formatDateTimeVNSplit(session.exit_time),
        duration:         computeDuration(session.entry_time, session.exit_time),
        fee:              session.final_fee ?? session.estimated_fee ?? null,
        feeDisplay:       session.exit_time
            ? formatCasualVND(session.final_fee ?? session.estimated_fee)
            : (session.estimated_fee ? formatCasualVND(session.estimated_fee) + ' (ước tính)' : '---'),
        paymentMethod:    (Array.isArray(session.payment) ? session.payment[0]?.payment_method : session.payment?.payment_method) || '---',
        paymentInfo:      (Array.isArray(session.payment) ? session.payment[0] : session.payment) || null,
        status:     session.status || '---',
        entryGate:  session.entry_gate?.name || '---',
        exitGate:   session.exit_gate?.name  || '---',
        staffIn:    session.staff_in?.full_name || '---',
    };
}

// ─── Exported Service Functions ───────────────────────────────────────────────

/**
 * Lấy danh sách nhật ký thẻ lượt (đã map sang row bảng).
 */
export async function getCasualCardLog() {
    const sessions = await casualCardRepository.getCasualCardSessions();
    return sessions.map(mapSessionToRow);
}

/**
 * Lấy tổng doanh thu thẻ lượt.
 */
export async function getCasualTotalRevenue() {
    return casualCardRepository.getCasualTotalRevenue();
}
