// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho userApi với baseURL từ biến môi trường
const API = axios.create({
    // baseURL: "http://localhost:3636/api"     // (đã comment) — URL cứng khi dev local
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất trước mỗi request
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
        console.warn('[userApi] Could not get session token:', err.message);
    }
    return config;
});

// Placeholder getAuthHeaders — interceptor đã tự xử lý, giữ để tương thích với code cũ
const getAuthHeaders = () => ({});

/**
 * Lấy danh sách tất cả người dùng kèm thông tin role
 * Dùng trong trang UserManagementPage (Phân quyền) của Admin
 */
export const getUsers = async () => {
    const response = await API.get("/users");
    return response.data.data || response.data; // Hỗ trợ cả 2 cấu trúc response
};

/**
 * Cập nhật role của một người dùng (Admin phân quyền lại)
 * @param {string} userId - UUID của người dùng cần cập nhật role
 * @param {string} roleName - Role mới: "ADMIN" | "MANAGER" | "STAFF"
 */
export const updateUserRole = async (userId, roleName) => {
    const response = await API.patch(`/users/${userId}/role`, {
        role_name: roleName // Tên role mới gửi lên server
    });
    return response.data;
};

/**
 * Cập nhật thông tin cơ bản của người dùng (Admin chỉnh sửa thông tin nhân viên)
 * @param {string} userId - UUID của người dùng cần cập nhật
 * @param {object} profileData - { phone, full_name, status }
 *   phone: số điện thoại mới
 *   full_name: tên đầy đủ mới
 *   status: trạng thái tài khoản (active/inactive)
 */
export const updateUserProfile = async (userId, profileData) => {
    const response = await API.patch(`/users/${userId}/profile`, profileData);
    return response.data;
};

/**
 * Lấy danh sách nhật ký đăng nhập hệ thống
 * Dùng trong trang LoginLogPage để Admin/Manager xem lịch sử đăng nhập
 */
export const getLoginLogs = async () => {
    const response = await API.get("/users/login-logs", {
        headers: getAuthHeaders()
    });
    return response.data;
};
