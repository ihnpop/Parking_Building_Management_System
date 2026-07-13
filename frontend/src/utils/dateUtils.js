/**
 * Lấy giờ hiện tại theo timezone Việt Nam
 * Format: yyyy-MM-ddTHH:mm (dùng cho input datetime-local)
 */
export const getVNDateTimeLocal = () => {
    const nowVN = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    );
    const pad = (n) => String(n).padStart(2, '0');
    return `${nowVN.getFullYear()}-${pad(nowVN.getMonth() + 1)}-${pad(nowVN.getDate())}T${pad(nowVN.getHours())}:${pad(nowVN.getMinutes())}`;
};

/**
 * Lấy ngày hiện tại theo timezone Việt Nam
 * Format: yyyy-MM-dd (dùng cho input date)
 */
export const getVNDateLocal = () => {
    const nowVN = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    );
    const pad = (n) => String(n).padStart(2, '0');
    return `${nowVN.getFullYear()}-${pad(nowVN.getMonth() + 1)}-${pad(nowVN.getDate())}`;
};

/**
 * Format datetime string sang dạng hiển thị dd/MM/yyyy HH:mm
 */
export const formatVNDateTime = (dateStr) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};