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