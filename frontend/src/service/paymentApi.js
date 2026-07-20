/**
 * paymentApi.js
 * Cung cấp các phương thức gọi API HTTP (Axios) từ Frontend Client tới Backend Server
 * để khởi tạo hóa đơn và truy vấn thông tin thanh toán VNPay.
 */

import axios from "axios";
import supabase from "../config/supabaseClient";

// Khởi tạo instance Axios kết nối với backend port 3636
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (err) {
        console.warn('[paymentApi] Could not get session token:', err.message);
    }
    return config;
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

/**
 * API: Kiểm tra thông tin xe ra và tính phí trước (check-exit)
 */
export const checkExitFee = (plateNumber) =>
    API.get(`/gate/check-exit`, { params: { plate_number: plateNumber }, headers: getAuthHeaders() });

/**
 * API: Thanh toán tiền mặt
 */
export const payCash = (sessionId) =>
    API.post("/payments/cash", { sessionId }, { headers: getAuthHeaders() });

/**
 * API: Khởi tạo thanh toán VNPay an toàn
 */
export const createVnpayCheckout = (sessionId) =>
    API.post("/payments/vnpay/create", { sessionId }, { headers: getAuthHeaders() });

/**
 * API: Polling trạng thái thanh toán VNPay theo order_code
 */
export const getPaymentStatus = (orderCode) =>
    API.get("/payments/status", { params: { order_code: orderCode } });