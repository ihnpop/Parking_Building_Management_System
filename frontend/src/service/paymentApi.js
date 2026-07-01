/**
 * paymentApi.js
 * Cung cấp các phương thức gọi API HTTP (Axios) từ Frontend Client tới Backend Server
 * để khởi tạo hóa đơn và truy vấn thông tin thanh toán VNPay.
 */

import axios from "axios";

// Khởi tạo instance Axios kết nối với backend port 3636
const API = axios.create({
    baseURL: "http://localhost:3636/api",
});

// Hàm hỗ trợ đính kèm mã định danh JWT Token tự động vào header để xác thực quyền truy cập
const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * API: Khởi tạo thanh toán Vé lượt (cho xe chuẩn bị xuất bến)
 */
export const createCheckoutPayment = (sessionId, amount) =>
    API.post("/payments/checkout", { sessionId, amount }, { headers: getAuthHeaders() });

/**
 * API: Khởi tạo thanh toán Đăng ký/Gia hạn Vé tháng
 */
export const createPackagePayment = (vehiclePackageId, amount, isRenewal) =>
    API.post("/payments/package", { vehiclePackageId, amount, isRenewal }, { headers: getAuthHeaders() });

/**
 * API: Lấy thông tin chi tiết một hóa đơn bằng mã đơn hàng (orderCode) 
 * (Dùng công khai ở màn hình kết quả hóa đơn nên không cần đính kèm JWT Token)
 */
export const getPaymentByOrderCode = (orderCode) =>
    API.get(`/payments/${orderCode}`);