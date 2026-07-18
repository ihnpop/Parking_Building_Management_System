/**
 * casualCardController.js
 * Tầng điều khiển (Controller) xử lý HTTP request/response cho Nhật ký thẻ lượt.
 */

import * as casualCardService from "../service/casualCardService.js";

/**
 * GET /api/casual-card/sessions
 * Trả về danh sách nhật ký phiên gửi xe thẻ lượt (đã map sang row bảng).
 */
export const getCasualCardLog = async (req, res) => {
    try {
        const data = await casualCardService.getCasualCardLog();
        return res.json(data);
    } catch (err) {
        console.error("[CasualCardController] getCasualCardLog error:", err);
        return res.status(500).json({
            message: err.message || "Lỗi server khi lấy nhật ký thẻ lượt"
        });
    }
};

/**
 * GET /api/casual-card/revenue
 * Trả về tổng doanh thu thẻ lượt.
 */
export const getCasualTotalRevenue = async (req, res) => {
    try {
        const total = await casualCardService.getCasualTotalRevenue();
        return res.json({ total });
    } catch (err) {
        console.error("[CasualCardController] getCasualTotalRevenue error:", err);
        return res.status(500).json({
            message: err.message || "Lỗi server khi lấy doanh thu thẻ lượt"
        });
    }
};
