import API from "./apiClient";
import { inviteUser } from "./userApi";

// Re-export inviteUser for backward compatibility
export { inviteUser };

// ─── Thẻ lượt (Casual Card) ───────────────────────────────────────────────────

/** Lấy toàn bộ danh sách thẻ lượt (casual cards) từ server */
export const getCards = async () => {
    const response = await API.get("/cards/card");
    return response.data.data || response.data;
};

/** Lấy toàn bộ danh sách thẻ tháng (monthly cards) */
export const getMonthCards = async () => {
    const response = await API.get("/cards/month-card");
    return response.data.data || response.data;
};

/** Lấy danh sách các thẻ đã bị báo mất */
export const getLostCards = async () => {
    const response = await API.get("/cards/lost-card");
    return response.data.data || response.data;
};

/** Lấy nhật ký giao dịch thẻ tháng (lịch sử đăng ký, gia hạn) */
export const getMonthCardLogs = async () => {
    const response = await API.get("/cards/month-card-logs");
    return response.data.data || response.data;
};

/**
 * Tạo mới thẻ lượt
 * @param {object} payload - Dữ liệu thẻ cần tạo
 */
export const createCard = async (payload) => {
    const response = await API.post("/cards/card", payload);
    return response.data.data || response.data;
};

/**
 * Xóa thẻ lượt theo ID
 * @param {string} cardId - ID của thẻ cần xóa
 * @param {string} deletedBy - ID hoặc tên người thực hiện xóa
 */
export const deleteCard = async (cardId, deletedBy) => {
    const response = await API.delete(`/cards/card/${cardId}`, {
        data: { deleted_by: deletedBy }
    });
    return response.data;
};

// ─── Báo mất thẻ (Lost Card) ─────────────────────────────────────────────────

/** Tạo báo cáo mất thẻ mới */
export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload);
    return response.data.data || response.data;
};

/** Kiểm tra biển số xe xem có thẻ đang trong trạng thái báo mất không */
export const checkLostCardPlate = async (payload) => {
    const response = await API.post("/cards/lost-card/check-plate", payload);
    return response.data.data || response.data;
};

/** Cập nhật thông tin một báo cáo mất thẻ */
export const updateLostCard = async (reportId, payload) => {
    const response = await API.put(`/cards/lost-card/${reportId}`, payload);
    return response.data.data || response.data;
};

/** Chấp nhận báo cáo mất thẻ */
export const acceptLostCard = async (reportId) => {
    const response = await API.put(`/cards/lost-card/${reportId}/accept`);
    return response.data.data || response.data;
};

/** Hủy báo cáo mất thẻ */
export const cancelLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/cancel`, payload);
    return response.data.data || response.data;
};

/** Giải quyết xong báo cáo mất thẻ */
export const resolveLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/resolve`, payload);
    return response.data.data || response.data;
};

/** Cấp lại thẻ mới cho xe bị mất thẻ */
export const reissueCard = async (payload) => {
    const response = await API.post("/cards/lost-card/reissue", payload);
    return response.data.data || response.data;
};

/** Xác nhận thu tiền mặt phí cấp lại thẻ tại quầy */
export const confirmReissueCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-reissue-cash/${orderCode}`);
    return response.data.data || response.data;
};

/** Khởi tạo thanh toán phí mất thẻ lượt qua VNPay */
export const initiateLostTurnCardPayment = async (payload) => {
    const response = await API.post("/cards/lost-card/lost-turn-card-payment", payload);
    return response.data.data || response.data;
};

/** Xác nhận thu tiền mặt phí mất thẻ lượt */
export const confirmLostTurnCardCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-lost-turn-card-cash/${orderCode}`);
    return response.data.data || response.data;
};

/** Lấy lịch sử toàn bộ báo cáo mất thẻ (đã xử lý xong) */
export const getLostCardHistory = async () => {
    const response = await API.get("/cards/lost-card/history");
    return response.data.data || response.data;
};

/** Cập nhật thông tin thẻ lượt theo ID */
export const updateCard = async (id, payload) => {
    const response = await API.put(`/cards/${id}`, payload);
    return response.data.data || response.data;
};
