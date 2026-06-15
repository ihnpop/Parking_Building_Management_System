import supabase from "../config/supabaseClient.js";

/**
 * GET /api/users
 * Lấy danh sách tất cả người dùng kèm thông tin role
 */
export const getUsers = async (req, res) => {
    try {
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

        if (error) {
            return res.status(400).json({ message: error.message });
        }

        return res.json({ data });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * PATCH /api/users/:id/role
 * Cập nhật role cho một người dùng (chỉ ADMIN)
 * Body: { role_name: "ADMIN" | "MANAGER" | "STAFF" }
 */
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name } = req.body;

        if (!role_name) {
            return res.status(400).json({ message: "role_name là bắt buộc" });
        }

        const validRoles = ["ADMIN", "MANAGER", "STAFF"];
        if (!validRoles.includes(role_name)) {
            return res.status(400).json({
                message: `role_name phải là một trong: ${validRoles.join(", ")}`
            });
        }

        // Bước 1: Lấy role_id từ bảng role theo role_name
        const { data: roleData, error: roleError } = await supabase
            .from("role")
            .select("role_id")
            .eq("role_name", role_name)
            .single();

        if (roleError || !roleData) {
            return res.status(404).json({ message: "Không tìm thấy role" });
        }

        // Bước 2: Cập nhật profiles.role_id
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ role_id: roleData.role_id })
            .eq("id", id);

        if (updateError) {
            return res.status(400).json({ message: updateError.message });
        }

        return res.json({ message: "Cập nhật role thành công" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
