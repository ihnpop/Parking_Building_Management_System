import supabase from "../config/supabaseClient.js";
import supabaseAdmin from "../config/supabaseAdmin.js";

/**
 * Gửi invite qua Supabase Auth Admin API
 * @param {string} email 
 * @param {string} redirectTo 
 * @returns {Promise<object>}
 */
export const inviteUserByEmail = async (email, redirectTo) => {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
    });
    if (error) throw error;
    return data;
};

/**
 * Xóa một user từ Supabase Auth (dùng để rollback)
 * @param {string} userId 
 * @returns {Promise<void>}
 */
export const deleteAuthUser = async (userId) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
};

/**
 * Tạo mới một profile người dùng trong bảng profiles
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
export const createProfile = async (profileData) => {
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .insert(profileData)
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Lấy danh sách tất cả profile kèm thông tin role
 * @returns {Promise<object[]>}
 */
export const getAllProfilesWithRoles = async () => {
    const { data, error } = await supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            email,
            phone,
            status,
            created_at,
            role:role_id (
                role_id,
                role_name
            )
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
};

/**
 * Tìm role_id dựa vào role_name
 * @param {string} roleName 
 * @returns {Promise<object|null>}
 */
export const findRoleByName = async (roleName) => {
    const { data, error } = await supabase
        .from("role")
        .select("role_id")
        .eq("role_name", roleName)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Cập nhật thông tin profile (phone, full_name, status)
 * @param {string} id
 * @param {object} profileData - { phone, full_name, status }
 * @returns {Promise<object>}
 */
export const updateProfile = async (id, profileData) => {
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(profileData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Cập nhật role_id của một profile
 * @param {string} id 
 * @param {string} roleId 
 * @returns {Promise<void>}
 */
export const updateProfileRole = async (id, roleId) => {
    const { error } = await supabase
        .from("profiles")
        .update({ role_id: roleId })
        .eq("id", id);

    if (error) throw error;
};

/**
 * Lấy lịch sử log đăng nhập
 * @param {number} limit 
 * @returns {Promise<object[]>}
 */
export const getLoginLogs = async () => {
    const { data, error } = await supabase
        .from("login_logs")
        .select(`
            log_id,
            profiles_id,
            username,
            ip_address,
            device_browser,
            location,
            status,
            login_time
        `)
        .order("login_time", { ascending: false });

    if (error) throw error;
    return data || [];
};

/**
 * Lấy danh sách profiles theo danh sách ID
 * @param {string[]} ids 
 * @returns {Promise<object[]>}
 */
export const getProfilesByIds = async (ids) => {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role_id")
        .in("id", ids);

    if (error) throw error;
    return data || [];
};

/**
 * Lấy danh sách roles theo danh sách ID
 * @param {string[]} ids 
 * @returns {Promise<object[]>}
 */
export const getRolesByIds = async (ids) => {
    const { data, error } = await supabase
        .from("role")
        .select("role_id, role_name")
        .in("role_id", ids);

    if (error) throw error;
    return data || [];
};
