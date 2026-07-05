import axios from "axios";

const API = axios.create({
    // baseURL: "http://localhost:3636/api"     //sửa chỗ này
    baseURL: import.meta.env.VITE_API_URL
})
/**
 * Lấy danh sách tất cả người dùng kèm thông tin role
 */
export const getUsers = async () => {
    const response = await API.get("/users");
    return response.data.data || response.data;
};

const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
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
