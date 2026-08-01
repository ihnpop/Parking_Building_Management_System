import API from "./apiClient";
import { formatVND } from "../utils/formatters";
import { dashboardFallbackData } from "../utils/dashboardConstants";

// Re-export utility formatters & fallback constants for backward compatibility
export { formatVND, dashboardFallbackData };

/**
 * Gọi API lấy dữ liệu thống kê tổng quan và các biểu đồ
 * @param {string} filterType - 'day' | 'week' | 'month'
 * @param {string} date - Ngày cụ thể (YYYY-MM-DD)
 * @param {string} month - Tháng cụ thể (YYYY-MM)
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
