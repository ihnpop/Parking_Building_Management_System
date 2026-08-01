import API from "./apiClient";

/**
 * Lấy danh sách gói cước gia hạn thẻ tháng từ API
 * @returns {Promise<Array>}
 */
export const getRenewPackages = async () => {
    const response = await API.get("/month-card/renew-packages");
    return response.data;
};

/**
 * Cập nhật thông tin thẻ tháng
 * @param {string} id - card_id của thẻ cần cập nhật
 * @param {object} payload - Dữ liệu cần cập nhật
 * @returns {Promise<object>}
 */
export const updateMonthCard = async (id, payload) => {
    const response = await API.put(`/month-card/${id}`, payload);
    return response.data;
};

/**
 * Gửi dữ liệu ảnh Base64 lên Backend để kiểm tra eKYC
 * @param {string} frontBase64 
 * @param {string} backBase64 
 * @returns {Promise<object>}
 */
export const verifyEkyc = async (frontBase64, backBase64) => {
    const response = await API.post('/month-card/verify-document', {
        img_front_base64: frontBase64,
        img_back_base64: backBase64
    });
    return response.data;
};

// Object container kept for backward compatibility with existing callers
export const monthCardApi = {
    verifyEkyc
};

/**
 * Lấy danh sách thẻ tháng hiện có
 * @returns {Promise<Array>}
 */
export const getMonthCards = async () => {
    const response = await API.get("/month-card/");
    return response.data.data || response.data;
};

/**
 * Lấy lịch sử giao dịch thẻ tháng
 * @returns {Promise<Array>}
 */
export const getMonthCardLogs = async () => {
    const response = await API.get("/month-card/logs");
    return response.data.data || response.data;
};

/**
 * Tạo mới thẻ tháng
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createMonthCard = async (payload) => {
    const response = await API.post("/month-card/create", payload);
    return response.data;
};

/**
 * Xóa mềm thẻ tháng theo ID
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteMonthCard = async (id) => {
    const response = await API.delete(`/month-card/${id}`);
    return response.data;
};

// ─── RENEWAL APIs ─────────────────────────────────────────────────────────────

/**
 * Lấy thông tin gia hạn
 * @param {string} cardId
 */
export const getRenewalInfo = async (cardId) => {
    const response = await API.get(`/month-card/${cardId}/renewal-info`);
    return response.data.data || response.data;
};

/**
 * Khởi tạo giao dịch gia hạn thẻ tháng
 * @param {{ cardId, packageId, paymentMethod }} payload
 */
export const initiateRenewal = async (payload) => {
    const response = await API.post('/month-card/initiate-renewal', payload);
    return response.data.data || response.data;
};

/**
 * Xác nhận thu tiền mặt gia hạn thẻ tháng tại quầy
 * @param {string} orderCode
 */
export const confirmRenewalCash = async (orderCode) => {
    const response = await API.post(`/month-card/confirm-renewal-cash/${orderCode}`, {});
    return response.data;
};

/**
 * Kiểm tra trạng thái giao dịch gia hạn
 * @param {string} orderCode
 */
export const getRenewalStatus = async (orderCode) => {
    const response = await API.get(`/month-card/renewal-status/${orderCode}`);
    return response.data.data || response.data;
};
