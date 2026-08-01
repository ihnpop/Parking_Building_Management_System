// Import axios để gọi HTTP API từ frontend
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho cardApi với baseURL từ biến môi trường
const API = axios.create({
    // baseURL: "http://localhost:3636/api"     // (đã comment) — URL cứng dùng khi dev local
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất trước mỗi request (interceptor chạy trước mỗi call)
API.interceptors.request.use(async (config) => {
    try {
        // Lấy session hiện tại từ Supabase SDK
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            // Đính token hợp lệ vào header
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            // Fallback: lấy token từ localStorage nếu không có session Supabase
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (err) {
        console.warn('[cardApi] Could not get session token:', err.message);
    }
    return config;
});


// ─── Thẻ lượt (Casual Card) ───────────────────────────────────────────────────

/** Lấy toàn bộ danh sách thẻ lượt (casual cards) từ server */
export const getCards = async () => {
    const response = await API.get("/cards/card")
    return response.data.data || response.data // Hỗ trợ cả 2 cấu trúc response { data: [...] } và [...]
}

/** Lấy toàn bộ danh sách thẻ tháng (monthly cards) */
export const getMonthCards = async () => {
    const response = await API.get("/cards/month-card")
    return response.data.data || response.data
}

/** Lấy danh sách các thẻ đã bị báo mất */
export const getLostCards = async () => {
    const response = await API.get("/cards/lost-card")
    return response.data.data || response.data
}

/** Lấy nhật ký giao dịch thẻ tháng (lịch sử đăng ký, gia hạn) */
export const getMonthCardLogs = async () => {
    const response = await API.get("/cards/month-card-logs")
    return response.data.data || response.data
}

/**
 * Tạo mới thẻ lượt
 * @param {object} payload - Dữ liệu thẻ cần tạo (card_code, vehicle_type, ...)
 */
export const createCard = async (payload) => {
    const response = await API.post("/cards/card", payload)
    return response.data.data || response.data
}

/**
 * Xóa thẻ lượt theo ID
 * @param {string} cardId - ID của thẻ cần xóa
 * @param {string} deletedBy - ID hoặc tên người thực hiện xóa (ghi vào audit log)
 */
export const deleteCard = async (cardId, deletedBy) => {
    const response = await API.delete(`/cards/card/${cardId}`, {
        data: { deleted_by: deletedBy } // Gửi thông tin người xóa trong request body
    })
    return response.data
}

// ─── Báo mất thẻ (Lost Card) ─────────────────────────────────────────────────

/**
 * Tạo báo cáo mất thẻ mới
 * @param {object} payload - Thông tin báo mất (plate, card_code, ...)
 */
export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload);
    return response.data.data || response.data;
};

/**
 * Kiểm tra biển số xe xem có thẻ đang trong trạng thái báo mất không
 * @param {object} payload - { plateNumber }
 */
export const checkLostCardPlate = async (payload) => {
    const response = await API.post("/cards/lost-card/check-plate", payload);
    return response.data.data || response.data;
};

/**
 * Cập nhật thông tin một báo cáo mất thẻ
 * @param {string} reportId - ID của báo cáo mất thẻ
 * @param {object} payload - Dữ liệu cần cập nhật
 */
export const updateLostCard = async (reportId, payload) => {
    const response = await API.put(`/cards/lost-card/${reportId}`, payload);
    return response.data.data || response.data;
};

/**
 * Chấp nhận báo cáo mất thẻ (chuyển trạng thái sang "Đang xử lý")
 * @param {string} reportId - ID của báo cáo mất thẻ
 */
export const acceptLostCard = async (reportId) => {
    const response = await API.put(`/cards/lost-card/${reportId}/accept`);
    return response.data.data || response.data;
};

/**
 * Hủy báo cáo mất thẻ
 * @param {string} reportId - ID của báo cáo
 * @param {object} payload - Lý do hủy (nếu có)
 */
export const cancelLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/cancel`, payload);
    return response.data.data || response.data;
};

/**
 * Giải quyết xong báo cáo mất thẻ (đánh dấu hoàn thành)
 * @param {string} reportId - ID của báo cáo
 * @param {object} payload - Thông tin giải quyết
 */
export const resolveLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/resolve`, payload);
    return response.data.data || response.data;
};

/**
 * Cấp lại thẻ mới cho xe bị mất thẻ (reissue)
 * @param {object} payload - Thông tin thẻ cấp lại
 */
export const reissueCard = async (payload) => {
    const response = await API.post("/cards/lost-card/reissue", payload);
    return response.data.data || response.data;
};

/**
 * Xác nhận thu tiền mặt phí cấp lại thẻ tại quầy
 * @param {string} orderCode - Mã đơn hàng cần xác nhận
 */
export const confirmReissueCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-reissue-cash/${orderCode}`);
    return response.data.data || response.data;
};

/**
 * Khởi tạo thanh toán phí mất thẻ lượt qua VNPay
 * @param {object} payload - Thông tin phiên và lượt mất thẻ
 */
export const initiateLostTurnCardPayment = async (payload) => {
    const response = await API.post("/cards/lost-card/lost-turn-card-payment", payload);
    return response.data.data || response.data;
};

/**
 * Xác nhận thu tiền mặt phí mất thẻ lượt
 * @param {string} orderCode - Mã đơn hàng cần xác nhận
 */
export const confirmLostTurnCardCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-lost-turn-card-cash/${orderCode}`);
    return response.data.data || response.data;
};

/**
 * Lấy lịch sử toàn bộ báo cáo mất thẻ (đã xử lý xong)
 */
export const getLostCardHistory = async () => {
    const response = await API.get("/cards/lost-card/history");
    return response.data.data || response.data;
};

/**
 * Cập nhật thông tin thẻ lượt theo ID
 * @param {string} id - ID của thẻ cần cập nhật
 * @param {object} payload - Dữ liệu cần cập nhật
 */
export const updateCard = async (id, payload) => {
    const response = await API.put(
        `/cards/${id}`,
        payload
    );

    return response.data.data || response.data;
};

// Placeholder getAuthHeaders (đã được interceptor xử lý tự động — không cần dùng thủ công)
const getAuthHeaders = () => ({});

/**
 * Mời người dùng mới vào hệ thống bằng email
 * @param {object} payload - { email, username, full_name, phone, role_id, building_id }
 */
export const inviteUser = async (payload) => {
    // payload: { email, username, full_name, phone, role_id, building_id }
    const response = await API.post(`/users/invite`, payload);
    return response.data.data || response.data;
};
