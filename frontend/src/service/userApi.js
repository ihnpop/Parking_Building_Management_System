import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    // baseURL: "http://localhost:3636/api"     //sửa chỗ này
    baseURL: import.meta.env.VITE_API_URL
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
        console.warn('[userApi] Could not get session token:', err.message);
    }
    return config;
});

const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Lấy danh sách tất cả người dùng kèm thông tin role
 */
export const getUsers = async () => {
    const response = await API.get("/users");
    return response.data.data || response.data;
};

/**
 * Cập nhật role của một người dùng
 * @param {string} userId - UUID của người dùng
 * @param {string} roleName - "ADMIN" | "MANAGER" | "STAFF"
 */
export const updateUserRole = async (userId, roleName) => {
    const response = await API.patch(`/users/${userId}/role`, {
        role_name: roleName
    });
    return response.data;
};

/**
 * Lấy danh sách nhật ký đăng nhập
 */
export const getLoginLogs = async () => {
    const response = await API.get("/users/login-logs", {
        headers: getAuthHeaders()
    });
    return response.data;
};

