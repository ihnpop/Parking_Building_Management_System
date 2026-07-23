/**
 * dashboardController.js
 * Tầng điều khiển (Controller) xử lý HTTP request/response cho Dashboard.
 */

import * as dashboardService from "../service/dashboardService.js";
import supabase from "../config/supabaseClient.js";

/**
 * GET /api/dashboard/stats
 * Lấy các chỉ số KPI chính và biểu đồ hiển thị ở Dashboard chính
 */
export const getDashboardSummary = async (req, res) => {
    try {
        let targetBuildingId = null;
        if (req.user?.id) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("building_id, role:role_id(role_name)")
                .eq("id", req.user.id)
                .maybeSingle();

            const roleName = profile?.role?.role_name ? profile.role.role_name.toUpperCase() : null;
            // Nếu không phải ADMIN -> Lọc chỉ số theo building_id đã được ADMIN gán
            if (roleName !== "ADMIN" && profile?.building_id) {
                targetBuildingId = profile.building_id;
            }
        }

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
        const data = await dashboardService.getTodayRevenueBreakdown();
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
        const data = await dashboardService.getMonthlyRevenueBreakdown();
        return res.json(data);
    } catch (err) {
        console.error("[DashboardController] getMonthlyRevenueDetails error:", err);
        return res.status(500).json({ 
            message: err.message || "Lỗi server khi lấy chi tiết doanh thu tháng" 
        });
    }
};
