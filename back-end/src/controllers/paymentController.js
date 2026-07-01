import * as paymentService from "../service/paymentService.js";

// export const checkout = async (req, res) => {
//     try {
//         const { parkingOrderId } = req.body;
//         const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//         const result = await paymentService.createCheckoutPayment(parkingOrderId, ipAddr);
//         res.json(result);
//     } catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// };
export const getPaymentByOrderCode = async (req, res) => {
    try {
        const { orderCode } = req.params;
        const result = await paymentService.getPaymentByOrderCode(orderCode);
        res.json({ data: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const packagePayment = async (req, res) => {
    try {
        const { vehiclePackageId, amount, isRenewal } = req.body;
        const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const result = await paymentService.createPackagePayment(vehiclePackageId, amount, isRenewal, ipAddr);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
export const vnpayIpn = async (req, res) => {
    const result = await paymentService.handleIpn(req.query);
    res.status(200).json(result);
};

export const vnpayReturn = async (req, res) => {
    try {
        const orderCode = req.query.vnp_TxnRef;
        const frontendUrl = process.env.FRONTEND_URL;

        // Gọi handleIpn trực tiếp để xử lý nghiệp vụ cập nhật đơn hàng & logic đi kèm
        const ipnResult = await paymentService.handleIpn(req.query);
        console.log("[VNPAY Return] local IPN handling result:", ipnResult);

        // Trạng thái thành công khi checksum hợp lệ (hoặc đơn hàng đã được cập nhật trước đó) và mã phản hồi giao dịch thành công (00)
        const isSuccess = 
            (ipnResult.RspCode === "00" || ipnResult.Message === "Order already confirmed") && 
            req.query.vnp_ResponseCode === "00";

        const status = isSuccess ? "success" : "failed";
        res.redirect(`${frontendUrl}/payment-result?orderCode=${orderCode}&status=${status}`);
    } catch (err) {
        console.error("[VNPAY Return] Error processing return:", err);
        const orderCode = req.query.vnp_TxnRef || "";
        const frontendUrl = process.env.FRONTEND_URL;
        res.redirect(`${frontendUrl}/payment-result?orderCode=${orderCode}&status=failed`);
    }
};

export const checkout = async (req, res) => {
    try {
        const { sessionId, amount } = req.body;
        let ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        if (ipAddr === "::1" || ipAddr.includes("::ffff:")) {
            ipAddr = "127.0.0.1";
        }
        const result = await paymentService.createCheckoutPayment(sessionId, amount, ipAddr);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
