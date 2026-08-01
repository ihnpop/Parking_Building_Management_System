/**
 * UI Formatter Utilities
 * Centralized formatting helpers for dates, times, durations, and currency.
 */

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

/** Format datetime tách riêng thời gian (HH:mm) và ngày (DD/MM/YYYY) */
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

/** Tính thời gian gửi xe (entry -> exit) trả về dạng "Xg Yp" hoặc "X giờ" hoặc "Y phút" */
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

/** Format số tiền VND dùng Intl.NumberFormat (ví dụ: 14000 -> "14.000 ₫") */
export function formatCasualVND(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(num);
}

/** Format số tiền VND với fallback '0 ₫' */
export function formatVND(amount) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(amount));
}
