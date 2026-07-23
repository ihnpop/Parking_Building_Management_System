/**
 * dashboardController.js
 * Tầng điều khiển (Controller) xử lý HTTP request/response cho Dashboard.
 */

import * as dashboardService from "../service/dashboardService.js";
import { resolveBuildingIdFromReq } from "../middlewares/auth.js";

/**
 * GET /api/dashboard/stats
 * Lấy các chỉ số KPI chính và biểu đồ hiển thị ở Dashboard chính
 */
export const getDashboardSummary = async (req, res) => {
    try {
        const targetBuildingId = await resolveBuildingIdFromReq(req);
        const data = await dashboardService.getSummaryData(targetBuildingId);
        return res.json(data);
    } catch (err) {
        console.error("[DashboardController] getDashboardSummary error:", err);
        return res.status(500).json({ 
            message: err.message || "Lỗi server khi lấy dữ liệu tổng quan dashboard" 
        });
    }
};

/**
 * GET /api/dashboard/revenue/today
 * Lấy chi tiết doanh thu hôm nay phục vụ Breakdown Modal
 */
export const getTodayRevenueDetails = async (req, res) => {
    try {
        const targetBuildingId = await resolveBuildingIdFromReq(req);
        const data = await dashboardService.getTodayRevenueBreakdown(targetBuildingId);
        return res.json(data);
    } catch (err) {
        console.error("[DashboardController] getTodayRevenueDetails error:", err);
        return res.status(500).json({ 
            message: err.message || "Lỗi server khi lấy chi tiết doanh thu hôm nay" 
        });
    }
};

/**
 * GET /api/dashboard/revenue/month
 * Lấy chi tiết doanh thu tháng theo tuần phục vụ Breakdown Modal
 */
export const getMonthlyRevenueDetails = async (req, res) => {
    try {
        const targetBuildingId = await resolveBuildingIdFromReq(req);
        const data = await dashboardService.getMonthlyRevenueBreakdown(targetBuildingId);
        return res.json(data);
    } catch (err) {
        console.error("[DashboardController] getMonthlyRevenueDetails error:", err);
        return res.status(500).json({ 
            message: err.message || "Lỗi server khi lấy chi tiết doanh thu tháng" 
        });
    }
};
