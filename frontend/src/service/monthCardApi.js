// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho monthCardApi với baseURL trỏ tới endpoint /month-card
const API = axios.create({
    // baseURL: "http://localhost:3636/api"     // (đã comment) — URL cứng khi dev local
    baseURL: `${import.meta.env.VITE_API_URL}/month-card` // Tất cả endpoint trong file này đều nằm dưới /api/month-card/
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        // Lấy session Supabase hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            // Đính token vào header Authorization
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            // Fallback: lấy token từ localStorage
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (err) {
        console.warn('[monthCardApi] Could not get session token:', err.message);
    }
    return config;
});


// Helper để lấy token xác thực (đã được interceptor tự động xử lý — hàm này để giữ tương thích code cũ)
const getAuthHeaders = () => ({});

/**
 * Lấy danh sách gói cước gia hạn thẻ tháng từ API
 * (dùng để hiển thị các lựa chọn gói trong dialog gia hạn)
 * @returns {Promise<Array>}
 */
export const getRenewPackages = async () => {
    const response = await API.get("/renew-packages");
    return response.data;
};

/**
 * Cập nhật thông tin thẻ tháng (edit thông tin khách hàng, phương tiện, thời hạn)
 * @param {string} id - card_id của thẻ cần cập nhật
 * @param {object} payload - Dữ liệu cần cập nhật
 * @returns {Promise<object>}
 */
export const updateMonthCard = async (id, payload) => {
    const response = await API.put(`/${id}`, payload, {
        headers: getAuthHeaders() // Interceptor đã tự xử lý, headers này là placeholder
    });
    return response.data;
};

// Object gom các hàm eKYC (xác minh danh tính qua ảnh CCCD)
export const monthCardApi = {
    // Hàm gửi dữ liệu ảnh Base64 lên Backend — dùng instance API để interceptor tự đính token
    verifyEkyc: async (frontBase64, backBase64) => {
        const response = await API.post(
            '/verify-document', // Endpoint xử lý eKYC
            {
                img_front_base64: frontBase64, // Ảnh mặt trước CCCD dạng Base64
                img_back_base64: backBase64    // Ảnh mặt sau CCCD dạng Base64
            }
        );
        return response.data;
    }
};

/**
 * Lấy danh sách thẻ tháng hiện có
 * @returns {Promise<Array>}
 */
export const getMonthCards = async () => {
    const response = await API.get("/"); // GET /api/month-card/
    return response.data.data || response.data;
};

/**
 * Lấy lịch sử giao dịch thẻ tháng (đăng ký, gia hạn, thay đổi)
 * @returns {Promise<Array>}
 */
export const getMonthCardLogs = async () => {
    const response = await API.get("/logs"); // GET /api/month-card/logs
    return response.data.data || response.data;
};

/**
 * Tạo mới thẻ tháng (đăng ký mới cho khách hàng)
 * @param {object} payload - Thông tin đăng ký: tên, CCCD, biển số, loại xe, gói cước, ...
 * @returns {Promise<object>}
 */
export const createMonthCard = async (payload) => {
    const response = await API.post("/create", payload, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Xóa mềm thẻ tháng theo ID (đặt cờ is_deleted = true, không xóa khỏi CSDL)
 * @param {string} id - card_id của thẻ cần xóa
 * @returns {Promise<object>} Kết quả trả về từ server
 */
export const deleteMonthCard = async (id) => {
    const response = await API.delete(`/${id}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// ─────────────────────────────────────────────────────────────
// RENEWAL APIs (Gia hạn vé tháng qua VNPay / tiền mặt)
// ─────────────────────────────────────────────────────────────

/**
 * Lấy thông tin gia hạn: trạng thái thẻ, ngày hết hạn, danh sách gói khả dụng
 * (Dùng để hiển thị trong dialog gia hạn trước khi người dùng chọn gói)
 * @param {string} cardId - ID của thẻ tháng cần gia hạn
 */
export const getRenewalInfo = async (cardId) => {
    const response = await API.get(`/${cardId}/renewal-info`, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};

/**
 * Khởi tạo giao dịch gia hạn thẻ tháng
 * Trả về link thanh toán VNPay hoặc thông tin thanh toán tiền mặt
 * @param {{ cardId, packageId, paymentMethod: 'vnpay'|'cash' }} payload
 * @returns {{ orderCode, payUrl, amount, currentExpiry, newExpiry, packageName }}
 */
export const initiateRenewal = async (payload) => {
    const response = await API.post('/initiate-renewal', payload, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};

/**
 * Xác nhận thu tiền mặt gia hạn thẻ tháng tại quầy (cashier confirm)
 * @param {string} orderCode - Mã đơn hàng cần xác nhận đã thu tiền
 */
export const confirmRenewalCash = async (orderCode) => {
    const response = await API.post(`/confirm-renewal-cash/${orderCode}`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Kiểm tra trạng thái giao dịch gia hạn (dùng để polling sau khi redirect từ VNPay)
 * @param {string} orderCode - Mã đơn hàng cần kiểm tra trạng thái
 */
export const getRenewalStatus = async (orderCode) => {
    const response = await API.get(`/renewal-status/${orderCode}`, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};
