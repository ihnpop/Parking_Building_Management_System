/**
 * vnpayService.js
 * Dịch vụ tích hợp Cổng thanh toán VNPAY bằng SDK chính thức (vnpay npm package).
 * Đảm bảo mã hóa dữ liệu, sắp xếp tham số, và ký mã hash bảo mật chuẩn xác 100%.
 */

import { VNPay, ignoreLogger, ProductCode, VnpLocale } from "vnpay";

// Lazy initialization đối tượng VNPay để tránh lỗi biến môi trường (.env) chưa tải kịp lúc khởi động ứng dụng
let _vnpay = null;
function getVNPay() {
    if (!_vnpay) {
        _vnpay = new VNPay({
            tmnCode: process.env.VNP_TMN_CODE?.trim(), // Mã định danh Merchant (được cấp bởi VNPAY)
            secureSecret: process.env.VNP_HASH_SECRET?.trim(), // Chuỗi khóa bí mật dùng để ký hash bảo mật
            vnpayHost: "https://sandbox.vnpayment.vn", // Host URL môi trường kiểm thử Sandbox của VNPAY
            testMode: true, // Bật chế độ thử nghiệm
            hashAlgorithm: "SHA512", // Thuật toán băm chữ ký mặc định của VNPAY v2.1.0
            enableLog: false,
            loggerFn: ignoreLogger,
        });
    }
    return _vnpay;
}

/**
 * Hàm sinh đường dẫn thanh toán chuyển hướng sang Cổng VNPAY
 * 
 * @param {string} orderCode - Mã giao dịch duy nhất tự sinh từ hệ thống (VD: PO178291...)
 * @param {number} amount - Số tiền giao dịch thực tế (VNĐ, chưa nhân 100 - SDK sẽ tự nhân 100)
 * @param {string} orderInfo - Nội dung mô tả thanh toán (Không dấu)
 * @param {string} ipAddr - Địa chỉ IP của thiết bị khách hàng thực hiện yêu cầu thanh toán
 * @returns {string} URL chuyển hướng thanh toán VNPAY hoàn chỉnh có kèm mã chữ ký vnp_SecureHash
 */
export function createPaymentUrl({ orderCode, amount, orderInfo, ipAddr, origin }) {
    let returnUrl = process.env.VNP_RETURN_URL; // URL nhận kết quả thanh toán trả về trình duyệt

    if (origin) {
        try {
            const parsed = new URL(origin);
            const cleanOrigin = `${parsed.protocol}//${parsed.host}`;
            returnUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}origin=${encodeURIComponent(cleanOrigin)}`;
        } catch (e) {
            returnUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}origin=${encodeURIComponent(origin)}`;
        }
    }

    const paymentUrl = getVNPay().buildPaymentUrl({
        vnp_Amount: Math.round(amount), // Số tiền cần thanh toán
        vnp_IpAddr: ipAddr || "127.0.0.1", // IP client
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: orderCode, // Mã đơn hàng tham chiếu
        vnp_OrderInfo: orderInfo, // Nội dung thanh toán
        vnp_OrderType: ProductCode.Other, // Loại danh mục sản phẩm (Mặc định: Khác)
        vnp_Locale: VnpLocale.VN, // Ngôn ngữ hiển thị trên cổng (Mặc định: Tiếng Việt)
    });

    console.log("[VNPAY] Tạo URL thanh toán thành công:", paymentUrl);
    return paymentUrl;
}

/**
 * Hàm xác minh tính hợp lệ của chữ ký (vnp_SecureHash) do VNPAY gửi về
 * Áp dụng cho cả luồng phản hồi trực tiếp (Return) và luồng bất đồng bộ (IPN)
 * 
 * @param {object} query - Toàn bộ các tham số nhận về từ req.query
 * @returns {boolean} True nếu chữ ký hợp lệ (dữ liệu không bị chỉnh sửa), ngược lại là False
 */
export function verifySignature(query) {
    try {
        const result = getVNPay().verifyReturnUrl(query);
        return result.isVerified; // Trả về trạng thái xác thực từ SDK
    } catch (err) {
        console.error("[VNPAY] Lỗi trong quá trình xác thực chữ ký:", err.message);
        return false;
    }
}