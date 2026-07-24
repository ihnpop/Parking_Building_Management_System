import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất hoặc fallback từ localStorage trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            return config;
        }
    } catch (err) {
        // ignore
    }
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Gọi API lấy dữ liệu thống kê tổng quan và các biểu đồ
 */
export const fetchAllDashboardData = async (filterType = 'day', date = '', month = '') => {
    const response = await API.get("/dashboard/stats", {
        params: { filterType, date, month }
    });
    return response.data;
};

/**
 * Gọi API lấy dữ liệu doanh thu chi tiết hôm nay
 */
export const fetchTodayRevenueDetails = async () => {
    const response = await API.get("/dashboard/revenue/today");
    return response.data;
};

/**
 * Gọi API lấy dữ liệu doanh thu tháng theo tuần
 */
export const fetchMonthlyRevenueDetails = async () => {
    const response = await API.get("/dashboard/revenue/month");
    return response.data;
};

/** Format số tiền VND: 14000 → "14.000 ₫" */
export function formatVND(amount) {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(amount));
}

export const dashboardFallbackData = {
    revenueTrendBars: [
        { label: 'T2', h: 120, peak: false },
        { label: 'T3', h: 170, peak: false },
        { label: 'T4', h: 95, peak: false },
        { label: 'T5', h: 140, peak: false },
        { label: 'T6', h: 210, peak: false },
        { label: 'T7', h: 230, peak: true },
        { label: 'CN', h: 150, peak: false },
    ],
    revenueTrendMaxBar: 230,
};
