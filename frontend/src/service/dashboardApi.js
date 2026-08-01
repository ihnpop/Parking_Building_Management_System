// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho dashboardApi với baseURL từ biến môi trường
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất hoặc fallback từ localStorage trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        // Thử lấy session Supabase hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            // Đính token Supabase vào header và return sớm
            config.headers.Authorization = `Bearer ${session.access_token}`;
            return config;
        }
    } catch (err) {
        // ignore — tiếp tục thử fallback từ localStorage
    }
    // Fallback: lấy token từ localStorage nếu không có session Supabase
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Gọi API lấy dữ liệu thống kê tổng quan và các biểu đồ
 * Dùng trong trang Dashboard của Admin để hiển thị KPI, lưu lượng, doanh thu, ...
 * @param {string} filterType - Loại lọc: 'day' | 'week' | 'month'
 * @param {string} date - Ngày cụ thể (YYYY-MM-DD) khi filterType='day' hoặc 'week'
 * @param {string} month - Tháng cụ thể (YYYY-MM) khi filterType='month'
 */
export const fetchAllDashboardData = async (filterType = 'day', date = '', month = '') => {
    const response = await API.get("/dashboard/stats", {
        params: { filterType, date, month } // Gửi các filter theo query string
    });
    return response.data;
};

/**
 * Gọi API lấy dữ liệu doanh thu chi tiết hôm nay
 * Dùng để hiển thị trong modal "Chi tiết doanh thu hôm nay" (RevenueTodayModal)
 */
export const fetchTodayRevenueDetails = async () => {
    const response = await API.get("/dashboard/revenue/today");
    return response.data;
};

/**
 * Gọi API lấy dữ liệu doanh thu tháng theo tuần
 * Dùng để hiển thị trong modal "Doanh thu tháng" (RevenueMonthModal)
 */
export const fetchMonthlyRevenueDetails = async () => {
    const response = await API.get("/dashboard/revenue/month");
    return response.data;
};

/** Format số tiền VND: 14000 → "14.000 ₫" (dùng Intl.NumberFormat locale Việt Nam) */
export function formatVND(amount) {
    // Trả về '0 ₫' nếu giá trị null, undefined hoặc không phải số
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0, // Không hiển thị phần thập phân
    }).format(Number(amount));
}

// Dữ liệu fallback cho biểu đồ xu hướng doanh thu (dùng khi API không có dữ liệu)
// Hiển thị các thanh bar mặc định theo ngày trong tuần
export const dashboardFallbackData = {
    revenueTrendBars: [
        { label: 'T2', h: 120, peak: false }, // Thứ 2, chiều cao bar 120, không phải ngày cao điểm
        { label: 'T3', h: 170, peak: false }, // Thứ 3
        { label: 'T4', h: 95, peak: false },  // Thứ 4
        { label: 'T5', h: 140, peak: false }, // Thứ 5
        { label: 'T6', h: 210, peak: false }, // Thứ 6
        { label: 'T7', h: 230, peak: true },  // Thứ 7, chiều cao cao nhất, là ngày cao điểm
        { label: 'CN', h: 150, peak: false }, // Chủ nhật
    ],
    revenueTrendMaxBar: 230, // Giá trị cao nhất trong mảng (dùng để tính tỉ lệ phần trăm chiều cao bar)
};
