import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3636/api"
});

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
