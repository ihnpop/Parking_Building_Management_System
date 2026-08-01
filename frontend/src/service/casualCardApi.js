import API from "./apiClient";
import { formatDateTimeVN, formatDateTimeVNSplit, computeDuration, formatCasualVND } from "../utils/formatters";
import { mapSessionToRow } from "../utils/casualCardAdapter";

// Re-export utility formatters & data adapter for backward compatibility with UI components
export { formatDateTimeVN, formatDateTimeVNSplit, computeDuration, formatCasualVND, mapSessionToRow };

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách nhật ký thẻ lượt (đã map sang row bảng từ backend).
 * @returns {Promise<Array>}
 */
export async function getCasualCardSessions() {
    const response = await API.get("/casual-card/sessions");
    return response.data;
}

/**
 * Lấy tổng doanh thu thẻ lượt.
 * @returns {Promise<number>}
 */
export async function getCasualTotalRevenue() {
    const response = await API.get("/casual-card/revenue");
    return response.data.total;
}
