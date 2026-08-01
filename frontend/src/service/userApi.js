import API from "./apiClient";

/**
 * Mời người dùng mới vào hệ thống bằng email
 * @param {object} payload - { email, username, full_name, phone, role_id, building_id }
 */
export const inviteUser = async (payload) => {
    const response = await API.post(`/users/invite`, payload);
    return response.data.data || response.data;
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
 * @param {string} userId - UUID của người dùng cần cập nhật role
 * @param {string} roleName - Role mới: "ADMIN" | "MANAGER" | "STAFF"
 */
export const updateUserRole = async (userId, roleName) => {
    const response = await API.patch(`/users/${userId}/role`, {
        role_name: roleName
    });
    return response.data;
};

/**
 * Cập nhật thông tin cơ bản của người dùng
 * @param {string} userId - UUID của người dùng cần cập nhật
 * @param {object} profileData - { phone, full_name, status }
 */
export const updateUserProfile = async (userId, profileData) => {
    const response = await API.patch(`/users/${userId}/profile`, profileData);
    return response.data;
};

/**
 * Lấy danh sách nhật ký đăng nhập hệ thống
 */
export const getLoginLogs = async () => {
    const response = await API.get("/users/login-logs");
    return response.data;
};
