import supabaseAdmin from "../config/supabaseAdmin.js";

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
    const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo, // URL trang custom đặt password trong frontend của bạn
        });

    if (authError) {
        throw new Error(`Lỗi khi tạo invite: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 2. Insert vào bảng profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
            id: userId,
            role_id,
            username,
            full_name,
            email,
            phone,
            status: "Hoạt động",
            building_id,
        })
        .select()
        .single();

    if (profileError) {
        // Nếu insert profile lỗi, nên rollback user vừa tạo trong auth để tránh user "rác"
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Lỗi khi tạo profile: ${profileError.message}`);
    }

    return profileData;
};