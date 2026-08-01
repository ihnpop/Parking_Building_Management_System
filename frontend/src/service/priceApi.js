// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho priceApi với baseURL từ biến môi trường
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động gắn token Supabase mới nhất trước mỗi request
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
        console.warn("[priceApi] Could not get session token:", err.message);
    }
    return config;
});

/**
 * Lấy toàn bộ biểu giá theo tòa nhà của Manager
 * Bao gồm giá lượt (theo loại xe, giờ đầu, giờ phụ, tối đa ngày) và giá tháng (theo gói 1, 3, 6, 12 tháng)
 */
export const getPrices = async () => {
    const response = await API.get("/prices");
    return response.data.data; // Lấy field data trong response
};

/**
 * Cập nhật giá lượt (giá gửi xe theo giờ cho từng loại xe)
 * @param {object} payload - { vehicleTypeId, firstHour, extraHour, dayMax }
 *   vehicleTypeId: ID loại xe (xe máy, ô tô, ...)
 *   firstHour: phí giờ đầu tiên
 *   extraHour: phí mỗi giờ tiếp theo
 *   dayMax: mức phí tối đa/ngày
 */
export const updateSessionPrices = async (payload) => {
    const response = await API.put("/prices/session", payload);
    return response.data.data;
};

/**
 * Cập nhật giá tháng (gói đăng ký thẻ tháng theo loại xe)
 * @param {object} payload - { vehicleTypeId, vehicleType, price1Month, price3Month, price6Month, price12Month }
 *   vehicleTypeId: ID loại xe
 *   vehicleType: tên loại xe
 *   price1Month: giá gói 1 tháng
 *   price3Month: giá gói 3 tháng
 *   price6Month: giá gói 6 tháng
 *   price12Month: giá gói 12 tháng
 */
export const updateMonthlyPrices = async (payload) => {
    const response = await API.put("/prices/monthly", payload);
    return response.data.data;
};

/**
 * Cập nhật phí cấp lại thẻ (phí phạt khi khách báo mất thẻ)
 * @param {object} payload - { cardReissueFee } - số tiền phí cấp lại thẻ mới
 */
export const updateCardReissueFee = async (payload) => {
    // Assuming there is an endpoint like this. If not, it will return 404
    // We add this to support the requirement "Thêm hàm cập nhật card_reissue_fee"
    const response = await API.put("/prices/reissue-fee", payload);
    return response.data.data;
};
