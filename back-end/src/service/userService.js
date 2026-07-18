import * as userRepository from "../repositories/userRepository.js";

/**
 * Tạo lời mời cho staff mới:
 * 1. Gọi Supabase Admin API để tạo user trong auth.users + gửi email invite
 * 2. Insert thông tin nghiệp vụ vào bảng profiles
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.username
 * @param {string} payload.full_name
 * @param {string} payload.phone
 * @param {string} payload.role_id
 * @param {string} payload.building_id
 * @param {string} payload.redirectTo - URL trang custom set-password trong app
 */
export const inviteStaff = async ({
    email,
    username,
    full_name,
    phone,
    role_id,
    building_id,
    redirectTo,
}) => {
    // 1. Gửi invite qua Supabase Auth
    let authData;
    try {
        authData = await userRepository.inviteUserByEmail(email, redirectTo);
    } catch (authError) {
        throw new Error(`Lỗi khi tạo invite: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 2. Insert vào bảng profiles
    try {
        return await userRepository.createProfile({
            id: userId,
            role_id,
            username,
            full_name,
            email,
            phone,
            status: "Hoạt động",
            building_id,
        });
    } catch (profileError) {
        // Nếu insert profile lỗi, nên rollback user vừa tạo trong auth để tránh user "rác"
        try {
            await userRepository.deleteAuthUser(userId);
        } catch (rollbackError) {
            console.error("Lỗi rollback user:", rollbackError);
        }
        throw new Error(`Lỗi khi tạo profile: ${profileError.message}`);
    }
};