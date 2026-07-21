import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động gắn token Supabase mới nhất trước mỗi request
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
        console.warn("[priceApi] Could not get session token:", err.message);
    }
    return config;
});

/**
 * Lấy toàn bộ biểu giá theo tòa nhà của Manager
 */
export const getPrices = async () => {
    const response = await API.get("/prices");
    return response.data.data;
};

/**
 * Cập nhật giá lượt
 * @param {object} payload - { vehicleTypeId, firstHour, extraHour, dayMax }
 */
export const updateSessionPrices = async (payload) => {
    const response = await API.put("/prices/session", payload);
    return response.data.data;
};

/**
 * Cập nhật giá tháng
 * @param {object} payload - { vehicleTypeId, vehicleType, price1Month, price3Month, price6Month, price12Month }
 */
export const updateMonthlyPrices = async (payload) => {
    const response = await API.put("/prices/monthly", payload);
    return response.data.data;
};
