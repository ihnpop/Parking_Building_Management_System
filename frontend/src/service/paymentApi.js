/**
 * paymentApi.js
 * Cung cấp các phương thức gọi API HTTP (Axios) từ Frontend Client tới Backend Server
 * để khởi tạo hóa đơn và truy vấn thông tin thanh toán VNPay.
 */

// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Khởi tạo instance Axios kết nối với backend port 3636
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // URL backend từ biến môi trường
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        // Lấy session Supabase hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            // Đính token hợp lệ vào header
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            // Fallback: lấy token từ localStorage
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

// Hàm hỗ trợ đính kèm JWT (đã được interceptor xử lý tự động lấy token mới nhất)
const getAuthHeaders = () => ({});

/**
 * API: Khởi tạo thanh toán Vé lượt (cho xe chuẩn bị xuất bến)
 * Server sẽ tạo đơn hàng VNPay và trả về payUrl để redirect khách hàng
 * @param {string} sessionId - ID phiên gửi xe cần thanh toán
 * @param {number} amount - Số tiền cần thanh toán (VND)
 */
export const createCheckoutPayment = (sessionId, amount) =>
    API.post("/payments/checkout", { sessionId, amount }, { headers: getAuthHeaders() });

/**
 * API: Khởi tạo thanh toán Đăng ký/Gia hạn Vé tháng
 * @param {string} vehiclePackageId - ID gói xe tháng
 * @param {number} amount - Số tiền cần thanh toán
 * @param {boolean} isRenewal - true nếu là gia hạn, false nếu là đăng ký mới
 */
export const createPackagePayment = (vehiclePackageId, amount, isRenewal) =>
    API.post("/payments/package", { vehiclePackageId, amount, isRenewal }, { headers: getAuthHeaders() });

/**
 * API: Lấy thông tin chi tiết một hóa đơn bằng mã đơn hàng (orderCode) 
 * (Dùng công khai ở màn hình kết quả hóa đơn nên không cần đính kèm JWT Token)
 * @param {string} orderCode - Mã đơn hàng từ VNPay hoặc hệ thống nội bộ
 */
export const getPaymentByOrderCode = (orderCode) =>
    API.get(`/payments/${orderCode}`);

/**
 * API: Kiểm tra thông tin xe ra và tính phí trước (check-exit)
 * @param {string} plateNumber - Biển số xe cần kiểm tra
 */
export const checkExitFee = (plateNumber) =>
    API.get(`/gate/check-exit`, { params: { plate_number: plateNumber }, headers: getAuthHeaders() });

/**
 * API: Thanh toán tiền mặt cho phiên gửi xe (thu tiền mặt tại quầy, không qua VNPay)
 * @param {string} sessionId - ID phiên gửi xe cần thanh toán
 */
export const payCash = (sessionId) =>
    API.post("/payments/cash", { sessionId }, { headers: getAuthHeaders() });

/**
 * API: Khởi tạo thanh toán VNPay an toàn cho phiên gửi xe (xe lượt xuất bến)
 * Server tạo URL thanh toán VNPay và trả về để frontend redirect
 * @param {string} sessionId - ID phiên gửi xe cần thanh toán VNPay
 */
export const createVnpayCheckout = (sessionId) =>
    API.post("/payments/vnpay/create", { sessionId }, { headers: getAuthHeaders() });

/**
 * API: Polling trạng thái thanh toán VNPay theo order_code
 * Dùng trong PaymentResultPage để liên tục kiểm tra kết quả sau khi VNPay redirect về
 * @param {string} orderCode - Mã đơn hàng cần kiểm tra trạng thái
 */
export const getPaymentStatus = (orderCode) =>
    API.get("/payments/status", { params: { order_code: orderCode } });