import API from "./apiClient";

/**
 * API: Khởi tạo thanh toán Vé lượt
 * @param {string} sessionId
 * @param {number} amount
 */
export const createCheckoutPayment = async (sessionId, amount) => {
    const response = await API.post("/payments/checkout", { sessionId, amount });
    return response.data;
};

/**
 * API: Khởi tạo thanh toán Đăng ký/Gia hạn Vé tháng
 * @param {string} vehiclePackageId
 * @param {number} amount
 * @param {boolean} isRenewal
 */
export const createPackagePayment = async (vehiclePackageId, amount, isRenewal) => {
    const response = await API.post("/payments/package", { vehiclePackageId, amount, isRenewal });
    return response.data;
};

/**
 * API: Lấy thông tin chi tiết một hóa đơn bằng mã đơn hàng (orderCode)
 * @param {string} orderCode
 */
export const getPaymentByOrderCode = async (orderCode) => {
    const response = await API.get(`/payments/${orderCode}`);
    return response.data;
};

/**
 * API: Kiểm tra thông tin xe ra và tính phí trước (check-exit)
 * @param {string} plateNumber
 */
export const checkExitFee = async (plateNumber) => {
    const response = await API.get(`/gate/check-exit`, { params: { plate_number: plateNumber } });
    return response.data;
};

/**
 * API: Thanh toán tiền mặt cho phiên gửi xe
 * @param {string} sessionId
 */
export const payCash = async (sessionId) => {
    const response = await API.post("/payments/cash", { sessionId });
    return response.data;
};

/**
 * API: Khởi tạo thanh toán VNPay cho phiên gửi xe
 * @param {string} sessionId
 */
export const createVnpayCheckout = async (sessionId) => {
    const response = await API.post("/payments/vnpay/create", { sessionId });
    return response.data;
};

/**
 * API: Polling trạng thái thanh toán VNPay theo order_code
 * @param {string} orderCode
 */
export const getPaymentStatus = async (orderCode) => {
    const response = await API.get("/payments/status", { params: { order_code: orderCode } });
    return response.data;
};