import { VNPay, ignoreLogger, ProductCode, VnpLocale } from "vnpay";

// Lazy init để đảm bảo process.env đã được load bởi dotenv trước khi dùng
let _vnpay = null;
function getVNPay() {
    if (!_vnpay) {
        _vnpay = new VNPay({
            tmnCode: process.env.VNP_TMN_CODE?.trim(),
            secureSecret: process.env.VNP_HASH_SECRET?.trim(),
            vnpayHost: "https://sandbox.vnpayment.vn",
            testMode: true,
            hashAlgorithm: "SHA512",
            enableLog: false,
            loggerFn: ignoreLogger,
        });
    }
    return _vnpay;
}

/**
 * Tạo URL thanh toán VNPAY
 * @param {string} orderCode - Mã đơn hàng (unique)
 * @param {number} amount - Số tiền (VNĐ, chưa nhân 100 — SDK tự nhân)
 * @param {string} orderInfo - Thông tin đơn hàng (không dấu)
 * @param {string} ipAddr - IP người dùng
 * @returns {string} paymentUrl
 */
export function createPaymentUrl({ orderCode, amount, orderInfo, ipAddr }) {
    const returnUrl = process.env.VNP_RETURN_URL;

    const paymentUrl = getVNPay().buildPaymentUrl({
        vnp_Amount: Math.round(amount),
        vnp_IpAddr: ipAddr || "127.0.0.1",
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: orderCode,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: ProductCode.Other,
        vnp_Locale: VnpLocale.VN,
    });

    console.log("[VNPAY] Payment URL:", paymentUrl);
    return paymentUrl;
}

/**
 * Xác minh chữ ký từ VNPAY (dùng cho cả Return URL và IPN)
 * @param {object} query - req.query từ VNPAY callback
 * @returns {boolean}
 */
export function verifySignature(query) {
    try {
        const result = getVNPay().verifyReturnUrl(query);
        return result.isVerified;
    } catch (err) {
        console.error("[VNPAY] Verify error:", err.message);
        return false;
    }
}