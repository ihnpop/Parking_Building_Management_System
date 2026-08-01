import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    // baseURL: "http://localhost:3636/api"     //sửa chỗ này
    baseURL: `${import.meta.env.VITE_API_URL}/month-card`
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
        console.warn('[monthCardApi] Could not get session token:', err.message);
    }
    return config;
});


// Helper để lấy token xác thực (đã được interceptor tự động xử lý)
const getAuthHeaders = () => ({});

/**
 * Lấy danh sách gói cước gia hạn thẻ tháng từ API
 * @returns {Promise<Array>}
 */
export const getRenewPackages = async () => {
    const response = await API.get("/renew-packages");
    return response.data;
};

/**
 * Gửi yêu cầu gia hạn thẻ tháng lên API Backend
 * @param {object} payload - { registrationId, months, note }
 * @returns {Promise<object>}
 */
export const renewMonthCard = async (payload) => {
    const response = await API.post("/renew", payload, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Cập nhật thông tin thẻ tháng
 * @param {string} id - card_id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const updateMonthCard = async (id, payload) => {
    const response = await API.put(`/${id}`, payload, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const monthCardApi = {
    // Hàm gửi dữ liệu ảnh Base64 lên Backend — dùng instance API để interceptor tự đính token
    verifyEkyc: async (frontBase64, backBase64) => {
        const response = await API.post(
            '/verify-document',
            {
                img_front_base64: frontBase64,
                img_back_base64: backBase64
            }
        );
        return response.data;
    }
};

/**
 * Lấy danh sách thẻ tháng
 * @returns {Promise<Array>}
 */
export const getMonthCards = async () => {
    const response = await API.get("/");
    return response.data.data || response.data;
};

/**
 * Lấy lịch sử giao dịch thẻ tháng
 * @returns {Promise<Array>}
 */
export const getMonthCardLogs = async () => {
    const response = await API.get("/logs");
    return response.data.data || response.data;
};

/**
 * Tạo mới thẻ tháng (đăng ký mới)
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createMonthCard = async (payload) => {
    const response = await API.post("/create", payload, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Xóa mềm thẻ tháng theo ID
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
 * @param {string} cardId
 */
export const getRenewalInfo = async (cardId) => {
    const response = await API.get(`/${cardId}/renewal-info`, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};

/**
 * Khởi tạo giao dịch gia hạn
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
 * Xác nhận thu tiền mặt gia hạn (cashier)
 * @param {string} orderCode
 */
export const confirmRenewalCash = async (orderCode) => {
    const response = await API.post(`/confirm-renewal-cash/${orderCode}`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
};

/**
 * Kiểm tra trạng thái giao dịch gia hạn
 * @param {string} orderCode
 */
export const getRenewalStatus = async (orderCode) => {
    const response = await API.get(`/renewal-status/${orderCode}`, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};
