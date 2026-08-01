import API from "./apiClient";

/**
 * Lấy toàn bộ biểu giá theo tòa nhà của Manager
 */
export const getPrices = async () => {
    const response = await API.get("/prices");
    return response.data.data;
};

/**
 * Cập nhật giá lượt (giá gửi xe theo giờ cho từng loại xe)
 * @param {object} payload - { vehicleTypeId, firstHour, extraHour, dayMax }
 */
export const updateSessionPrices = async (payload) => {
    const response = await API.put("/prices/session", payload);
    return response.data.data;
};

/**
 * Cập nhật giá tháng (gói đăng ký thẻ tháng theo loại xe)
 * @param {object} payload - { vehicleTypeId, vehicleType, price1Month, price3Month, price6Month, price12Month }
 */
export const updateMonthlyPrices = async (payload) => {
    const response = await API.put("/prices/monthly", payload);
    return response.data.data;
};

/**
 * Cập nhật phí cấp lại thẻ
 * @param {object} payload - { cardReissueFee }
 */
export const updateCardReissueFee = async (payload) => {
    const response = await API.put("/prices/reissue-fee", payload);
    return response.data.data;
};
