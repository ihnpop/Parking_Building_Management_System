import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3636/api/month-card",
});

// Helper để lấy token xác thực từ localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
    // Hàm gửi dữ liệu ảnh Base64 lên Backend của bạn
    verifyEkyc: async (frontBase64, backBase64) => {
        const token = localStorage.getItem('supabase_token'); // Hoặc lấy từ AuthContext
        const response = await axios.post(
            `${API}/verify-ekyc`,
            {
                img_front_base64: frontBase64,
                img_back_base64: backBase64
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    }
};


