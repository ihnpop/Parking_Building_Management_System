import * as priceService from "../service/priceService.js";

/**
 * GET /api/prices
 * Lấy toàn bộ danh sách biểu giá (lượt & tháng) theo tòa nhà mà manager phụ trách
 */
export const getPricesController = async (req, res) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const data = await priceService.getPricesForManager(userId);
        return res.json({ success: true, data });
    } catch (err) {
        console.error("Lỗi getPricesController:", err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Lỗi server khi lấy thông tin biểu giá.",
        });
    }
};

/**
 * PUT /api/prices/session
 * Cập nhật giá lượt cho 1 loại xe
 */
export const updateSessionPricesController = async (req, res) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const payload = req.body;
        const data = await priceService.updateSessionPrices(userId, payload);
        return res.json({
            success: true,
            message: "Cập nhật biểu giá lượt thành công!",
            data,
        });
    } catch (err) {
        console.error("Lỗi updateSessionPricesController:", err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Lỗi server khi cập nhật giá lượt.",
        });
    }
};

/**
 * PUT /api/prices/monthly
 * Cập nhật giá tháng cho 1 loại xe
 */
export const updateMonthlyPricesController = async (req, res) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const payload = req.body;
        const data = await priceService.updateMonthlyPrices(userId, payload);
        return res.json({
            success: true,
            message: "Cập nhật biểu giá tháng thành công!",
            data,
        });
    } catch (err) {
        console.error("Lỗi updateMonthlyPricesController:", err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Lỗi server khi cập nhật giá tháng.",
        });
    }
};

/**
 * PUT /api/prices/reissue-fee
 * Cập nhật phí cấp lại thẻ
 */
export const updateCardReissueFeeController = async (req, res) => {
    try {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

        const payload = req.body;
        const data = await priceService.updateCardReissueFee(userId, payload);
        return res.json({
            success: true,
            message: "Cập nhật phí cấp lại thẻ thành công!",
            data,
        });
    } catch (err) {
        console.error("Lỗi updateCardReissueFeeController:", err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Lỗi server khi cập nhật phí cấp lại thẻ.",
        });
    }
};
