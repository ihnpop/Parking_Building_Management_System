import supabase from '../config/supabaseClient.js';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Yêu cầu đăng nhập." });
    }
    const token = authHeader.substring(7);
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Lỗi xác thực token." });
    }
};

export const authorize = (...roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Yêu cầu đăng nhập." });
        }
        const userId = req.user.id;

        const { data, error } = await supabase
            .from("profiles")
            .select(`
                role:role_id (
                    role_name
                )
            `)
            .eq("id", userId)
            .single();

        if (error || !data || !data.role) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const roleName = data.role.role_name;

        if (!roles.includes(roleName)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
};

export const checkActiveStaff = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Yêu cầu đăng nhập." });
    }
    try {
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", req.user.id)
            .maybeSingle();

        if (error || !profile) {
            return res.status(403).json({ message: "Không tìm thấy thông tin nhân viên." });
        }

        if (profile.status !== "Hoạt động") {
            return res.status(403).json({ message: "Tài khoản nhân viên đã bị vô hiệu hóa." });
        }

        next();
    } catch (err) {
        return res.status(500).json({ message: "Lỗi kiểm tra trạng thái nhân viên." });
    }
};

/**
 * Lấy building_id phù hợp với request:
 * - Nếu là Staff/Manager: Lấy building_id gán cho nhân viên (hoặc từ query param)
 * - Nếu là Admin: Lấy building_id từ query param (hoặc null nếu xem toàn bộ)
 */
export const resolveBuildingIdFromReq = async (req) => {
    let user = req.user;
    if (!user) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const { data: { user: u } } = await supabase.auth.getUser(token);
                user = u;
            } catch (err) {
                // ignore
            }
        }
    }

    if (user?.id) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("building_id, role:role_id(role_name)")
            .eq("id", user.id)
            .maybeSingle();

        const roleName = profile?.role?.role_name ? profile.role.role_name.toUpperCase() : null;
        if (roleName !== "ADMIN" && profile?.building_id) {
            return profile.building_id;
        }
    }

    return req.query.building_id || req.query.buildingId || null;
};