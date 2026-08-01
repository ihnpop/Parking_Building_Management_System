/**
 * Lấy giờ hiện tại theo timezone Việt Nam
 * Format: yyyy-MM-ddTHH:mm (dùng cho input datetime-local)
 * Ví dụ: "2025-08-01T14:30"
 */
export const getVNDateTimeLocal = () => {
    // Tạo Date object theo timezone Việt Nam bằng cách parse chuỗi locale của VN
    const nowVN = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    );
    // Hàm padding số thành chuỗi 2 chữ số (VD: 5 → "05")
    const pad = (n) => String(n).padStart(2, '0');
    // Ghép thành chuỗi theo format yyyy-MM-ddTHH:mm
    return `${nowVN.getFullYear()}-${pad(nowVN.getMonth() + 1)}-${pad(nowVN.getDate())}T${pad(nowVN.getHours())}:${pad(nowVN.getMinutes())}`;
};

/**
 * Lấy ngày hiện tại theo timezone Việt Nam
 * Format: yyyy-MM-dd (dùng cho input date)
 * Ví dụ: "2025-08-01"
 */
export const getVNDateLocal = () => {
    // Tạo Date object theo timezone Việt Nam
    const nowVN = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
    );
    // Hàm padding số
    const pad = (n) => String(n).padStart(2, '0');
    // Trả về chuỗi ngày dạng yyyy-MM-dd
    return `${nowVN.getFullYear()}-${pad(nowVN.getMonth() + 1)}-${pad(nowVN.getDate())}`;
};

/**
 * Format datetime string sang dạng hiển thị dd/MM/yyyy HH:mm theo timezone Việt Nam
 * Ví dụ: "2025-08-01T07:30:00Z" → "01/08/2025, 14:30"
 * @param {string} dateStr - Chuỗi datetime cần format
 * @returns {string} Chuỗi đã format hoặc '---' nếu không có giá trị
 */
export const formatVNDateTime = (dateStr) => {
    if (!dateStr) return '---'; // Trả về '---' nếu không có giá trị
    const date = new Date(dateStr); // Parse chuỗi thành Date object
    return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh', // Hiển thị theo múi giờ Việt Nam (UTC+7)
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};