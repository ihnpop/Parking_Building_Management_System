/**
 * casualCardApi.js
 * Gọi Backend API cho Nhật ký thẻ lượt (khách vãng lai).
 *
 * Endpoints:
 *   GET /api/casual-card/sessions → danh sách phiên (đã map sang row bảng)
 *   GET /api/casual-card/revenue  → { total: number } tổng doanh thu
 */

// Import axios để gọi HTTP request từ frontend
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho casualCardApi với baseURL từ biến môi trường
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Tự động gắn Supabase token vào mỗi request (interceptor chạy trước mỗi API call)
API.interceptors.request.use(async (config) => {
    try {
        // Lấy session Supabase hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            // Đính token hợp lệ vào header
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            // Fallback: lấy token từ localStorage
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
    if (!dateValue) return '---'; // Trả về '---' nếu không có giá trị
    try {
        let val = dateValue;
        if (typeof val === 'string') {
            // Chuẩn hóa chuỗi datetime: thay dấu cách bằng 'T' để đúng ISO format
            val = val.trim().replace(' ', 'T');
            // Kiểm tra có timezone suffix chưa (Z hoặc +HH:mm) — thêm 'Z' nếu thiếu
            const hasTimezone = val.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(val);
            if (!hasTimezone && val.includes('T')) val = val + 'Z'; // Thêm 'Z' để parse như UTC
        }
        const d = new Date(val); // Parse chuỗi sang Date object
        if (isNaN(d.getTime())) return '---'; // Parse thất bại → trả về '---'
        // Format theo locale Việt Nam với timezone Asia/Ho_Chi_Minh
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,        // Dùng định dạng 24h
            timeZone: 'Asia/Ho_Chi_Minh', // Múi giờ Việt Nam (UTC+7)
        }).format(d);
    } catch {
        return '---'; // Bắt mọi lỗi khác
    }
}

// Phiên bản tách riêng thời gian và ngày thành 2 dòng (dùng khi muốn hiển thị 2 dòng riêng biệt)
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

        // Format chỉ lấy phần thời gian (HH:mm)
        const time = new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        // Format chỉ lấy phần ngày (DD/MM/YYYY)
        const date = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        return { time, date }; // Trả về object gồm { time, date }
    } catch {
        return null;
    }
}

/** Tính thời gian gửi xe (entry → exit) và trả về chuỗi dạng "Xg Yp" hoặc "X giờ" hoặc "Y phút" */
export function computeDuration(entryTime, exitTime) {
    if (!entryTime || !exitTime) return '---'; // Thiếu một trong hai → không tính được
    try {
        const entry = new Date(entryTime);
        const exit = new Date(exitTime);
        const diffMs = exit - entry; // Chênh lệch tính bằng millisecond
        if (diffMs < 0) return '---'; // Xe ra trước xe vào → dữ liệu lỗi
        const totalMinutes = Math.floor(diffMs / 60000); // Chuyển sang phút
        const hours = Math.floor(totalMinutes / 60);     // Số giờ
        const minutes = totalMinutes % 60;               // Số phút lẻ
        if (hours > 0 && minutes > 0) return `${hours}g ${minutes}p`; // Ví dụ: "2g 30p"
        if (hours > 0) return `${hours} giờ`;            // Ví dụ: "3 giờ"
        return `${minutes} phút`;                         // Ví dụ: "45 phút"
    } catch {
        return '---';
    }
}

/** Format số tiền VND dùng Intl.NumberFormat (ví dụ: 14000 → "14.000 ₫") */
export function formatCasualVND(amount) {
    const num = Number(amount);
    // Kiểm tra giá trị hợp lệ trước khi format
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0, // Không hiển thị phần thập phân
    }).format(num);
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách nhật ký thẻ lượt (đã map sang row bảng từ backend).
 * @returns {Promise<Array>}
 */
export async function getCasualCardSessions() {
    const response = await API.get("/casual-card/sessions");
    return response.data; // Backend đã map sẵn sang format row bảng
}

/**
 * Lấy tổng doanh thu thẻ lượt.
 * @returns {Promise<number>}
 */
export async function getCasualTotalRevenue() {
    const response = await API.get("/casual-card/revenue");
    return response.data.total; // Chỉ lấy field "total" từ response
}

/**
 * Map session row sang định dạng bảng (giữ để tương thích nếu cần dùng local).
 * Lưu ý: backend đã map sẵn, hàm này chỉ là helper phòng hờ.
 */
export function mapSessionToRow(session) {
    // Kiểm tra phiên có phải thẻ tháng không (nhiều cách xác định vì dữ liệu từ nhiều nguồn)
    const isMonthlySession = session.ticket_type === 'Thẻ tháng' ||
        session.card_type === 'Thẻ tháng' ||
        session.card?.card_type === 'Thẻ tháng' ||
        session.card?.type === 'MONTHLY' ||
        session.is_monthly === true;

    // Chuẩn hóa trường payment thành mảng để xử lý thống nhất
    const paymentList = Array.isArray(session.payment) ? session.payment : (session.payment ? [session.payment] : []);
    // Tìm khoản thanh toán liên quan đến mất thẻ (payment_type = 'Phí mất thẻ lượt')
    const lostCardPayment = paymentList.find(p =>
        p.payment_type === 'Phí mất thẻ lượt' ||
        (p.payment_type && p.payment_type.toLowerCase().includes('mất thẻ'))
    );
    // Xác định phiên có phải báo mất thẻ không (theo nhiều dấu hiệu khác nhau)
    const isLostCard = !!lostCardPayment ||
        session.status === 'Mất thẻ' ||
        session.status === 'Thẻ đã cấp lại' ||
        session.is_lost_card === true ||
        !!session.lost_report_id;

    // Tách biệt hoàn toàn trạng thái phiên báo mất thành "Mất thẻ"
    let status = session.status || '---';
    if (isLostCard || status === 'Thẻ đã cấp lại') {
        status = 'Mất thẻ'; // Chuẩn hóa trạng thái
    }

    // Lấy thông tin payment đại diện (lostCard payment ưu tiên, nếu không thì lấy payment đầu tiên)
    const effectivePayment = lostCardPayment || paymentList[0] || null;
    
    // Tính tổng tiền phiên: Nếu là mất thẻ lượt, chỉ lấy phần Phí gửi xe (parkingFee) trong payload note, KHÔNG cộng gộp phí phạt mất thẻ
    let actualFee = 0;
    if (lostCardPayment) {
        // Parse note từ JSON string thành object nếu cần
        let noteObj = lostCardPayment.note;
        if (typeof noteObj === 'string') {
            try { noteObj = JSON.parse(noteObj); } catch(e) {}
        }
        // Lấy parkingFee từ note, fallback qua final_fee, estimated_fee
        actualFee = noteObj?.parkingFee ?? session.final_fee ?? session.estimated_fee ?? 0;
    } else if (paymentList.length > 0) {
        // Tính tổng tất cả payment trong phiên (cộng gộp các khoản)
        actualFee = paymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
        // Fallback: lấy phí từ session trực tiếp
        actualFee = session.final_fee ?? session.fee ?? session.estimated_fee ?? 0;
    }

    // Trả về row object đã được chuẩn hóa để hiển thị trong bảng
    return {
        session_id: session.session_id || '',
        cardCode: session.cardCode || session.card?.code || '---',           // Mã thẻ
        plate: session.plate || session.plate_number || '---',               // Biển số xe
        vehicleType: session.vehicleType || session.vehicle?.vehicle_type?.name || '---', // Loại xe
        entryTime: session.entryTime || session.entry_time || null,          // Thời gian vào (raw)
        exitTime: session.exitTime || session.exit_time || null,             // Thời gian ra (raw)
        entryTimeDisplay: session.entryTimeDisplay || formatDateTimeVN(session.entry_time || session.entryTime), // Thời gian vào đã format
        exitTimeDisplay: session.exitTimeDisplay || formatDateTimeVN(session.exit_time || session.exitTime),     // Thời gian ra đã format
        entryTimeSplit: session.entryTimeSplit || formatDateTimeVNSplit(session.entry_time || session.entryTime), // Thời gian vào dạng 2 dòng
        exitTimeSplit: session.exitTimeSplit || formatDateTimeVNSplit(session.exit_time || session.exitTime),    // Thời gian ra dạng 2 dòng
        duration: session.duration || computeDuration(session.entry_time || session.entryTime, session.exit_time || session.exitTime), // Thời gian gửi
        fee: actualFee,                                                      // Số tiền thực tế
        feeDisplay: formatCasualVND(actualFee),                              // Số tiền đã format VND
        paymentMethod: session.paymentMethod || effectivePayment?.payment_method || 'Tiền mặt', // Phương thức thanh toán
        paymentInfo: effectivePayment || session.paymentInfo || session.payment || null, // Chi tiết thanh toán
        isLostCardSession: isLostCard,   // Flag phiên mất thẻ
        isMonthlySession: isMonthlySession, // Flag phiên thẻ tháng
        status: status,                  // Trạng thái đã chuẩn hóa
        entryGate: session.entryGate || session.entry_gate?.name || '---',   // Tên cổng vào
        exitGate: session.exitGate || session.exit_gate?.name || '---',      // Tên cổng ra
        staffIn: session.staffIn || session.staff_in?.full_name || '---',    // Tên nhân viên ghi nhận vào
    };
}
