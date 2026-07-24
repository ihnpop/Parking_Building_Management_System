/**
 * paymentController.js
 * Bộ điều hướng (Controller) tiếp nhận các yêu cầu HTTP liên quan tới quy trình thanh toán.
 * Kết nối các Router endpoints với dịch vụ tương ứng trong paymentService.js.
 */

import * as paymentService from "../service/paymentService.js";

/**
 * Endpoint: Lấy thông tin chi tiết của một giao dịch bằng mã đơn hàng (orderCode)
 * Đường dẫn công khai dùng để hiển thị hóa đơn kết quả thanh toán
 */
export const getPaymentByOrderCode = async (req, res) => {
    try {
        const { orderCode } = req.params;
        const result = await paymentService.getPaymentByOrderCode(orderCode);
        res.json({ data: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * Endpoint: Khởi tạo thanh toán cho dịch vụ thẻ tháng (Đăng ký mới hoặc Gia hạn)
 */
export const packagePayment = async (req, res) => {
    try {
        const { vehiclePackageId, amount, isRenewal } = req.body;
        const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const origin = req.headers["origin"] || req.headers["referer"];
        
        // Tạo hóa đơn tạm ở database và lấy URL chuyển tiếp VNPay tương ứng
        const result = await paymentService.createPackagePayment(vehiclePackageId, amount, isRenewal, ipAddr, origin);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * Endpoint: Khởi tạo thanh toán cho dịch vụ vé lượt (Thanh toán để xe ra bãi)
 */
export const checkout = async (req, res) => {
    try {
        const { sessionId, amount } = req.body;
        let ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const origin = req.headers["origin"] || req.headers["referer"];
        
        // Chuẩn hóa địa chỉ IP cục bộ
        if (ipAddr === "::1" || ipAddr.includes("::ffff:")) {
            ipAddr = "127.0.0.1";
        }
        
        // Tạo hóa đơn tạm ở database và lấy URL chuyển tiếp VNPay tương ứng
        const result = await paymentService.createCheckoutPayment(sessionId, amount, ipAddr, origin);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * Endpoint IPN: Nhận thông báo giao dịch ngầm (bất đồng bộ) từ Server VNPay.
 * Dùng để cập nhật trạng thái thanh toán và chạy logic nghiệp vụ (mở cổng xe, gia hạn thẻ) an toàn.
 */
export const vnpayIpn = async (req, res) => {
    const result = await paymentService.handleIpn(req.query);
    res.status(200).json(result);
};

/**
 * Endpoint Return URL: Tiếp nhận trình duyệt người dùng chuyển hướng về từ cổng VNPay.
 * Luôn chuyển hướng người dùng về đúng domain Frontend (pbms.id.vn) hiển thị kết quả.
 */
export const vnpayReturn = async (req, res) => {
    try {
        const orderCode = req.query.vnp_TxnRef;
        const frontendUrl = process.env.FRONTEND_URL || "https://pbms.id.vn";

        // Gọi handleIpn cục bộ để cập nhật tức thì trạng thái DB (thống nhất trạng thái 'Đã thanh toán')
        const ipnResult = await paymentService.handleIpn(req.query);
        console.log("[VNPAY Return] Kết quả xử lý IPN cục bộ tại Return URL:", ipnResult);

        // Trạng thái được coi là thành công khi chữ ký hợp lệ (hoặc đơn hàng đã được cập nhật thành công) và mã phản hồi VNPay vnp_ResponseCode là "00"
        const isSuccess = 
            (ipnResult.RspCode === "00" || ipnResult.Message === "Order already confirmed") && 
            req.query.vnp_ResponseCode === "00";

        const status = isSuccess ? "success" : "failed";
        
        // Chuyển hướng người dùng về trang kết quả ở pbms.id.vn (HashRouter dạng /#/payment-result)
        res.redirect(`${frontendUrl}/#/payment-result?orderCode=${orderCode}&status=${status}`);
    } catch (err) {
        console.error("[VNPAY Return] Lỗi khi xử lý chuyển hướng trả về:", err);
        const orderCode = req.query.vnp_TxnRef || "";
        const frontendUrl = process.env.FRONTEND_URL || "https://pbms.id.vn";
        res.redirect(`${frontendUrl}/#/payment-result?orderCode=${orderCode}&status=failed`);
    }
};

/**
 * Endpoint: Thanh toán tiền mặt tại quầy cho Vé lượt (xe ra)
 * POST /api/payments/cash
 * Body: { sessionId }
 */
export const payCash = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const staffId = req.user?.id; // Lấy từ token sau verifyToken

        if (!sessionId) {
            return res.status(400).json({ message: "Thiếu sessionId" });
        }

        const result = await paymentService.cashPayment(sessionId, staffId);
        return res.json(result);
    } catch (err) {
        console.error("[payCash] Lỗi thanh toán tiền mặt:", err);
        const status = err.statusCode || 400;
        return res.status(status).json({ message: err.message || "Lỗi xử lý thanh toán tiền mặt" });
    }
};

/**
 * Endpoint: Khởi tạo thanh toán VNPay an toàn cho Vé lượt (xe ra)
 * POST /api/payments/vnpay/create
 * Body: { sessionId }
 */
export const createVnpayCheckout = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const staffId = req.user?.id;
        const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const origin = req.headers["origin"] || req.headers["referer"];

        if (!sessionId) {
            return res.status(400).json({ message: "Thiếu sessionId" });
        }

        const result = await paymentService.createVnpayPayment(sessionId, staffId, ipAddr, origin);
        return res.json({ data: result });
    } catch (err) {
        console.error("[createVnpayCheckout] Lỗi tạo giao dịch VNPay:", err);
        const status = err.statusCode || 400;
        return res.status(status).json({ message: err.message || "Lỗi tạo giao dịch VNPay" });
    }
};

/**
 * Endpoint: Lấy trạng thái giao dịch (polling từ frontend)
 * GET /api/payments/status?order_code=xxx
 */
export const getPaymentStatus = async (req, res) => {
    try {
        const { order_code } = req.query;
        if (!order_code) {
            return res.status(400).json({ message: "Thiếu mã order_code" });
        }
        const result = await paymentService.getPaymentStatus(order_code);
        return res.json({ data: result });
    } catch (err) {
        console.error("[getPaymentStatus] Lỗi kiểm tra trạng thái:", err);
        const status = err.statusCode || 400;
        return res.status(status).json({ message: err.message || "Lỗi truy vấn trạng thái giao dịch" });
    }
};

