export const authorize = (...roles) => {
    return async (req, res, next) => {

        const userId = req.user.id;

        const { data } = await supabase
            .from("profiles")
            .select(`
                role:role_id (
                    role_name
                )
            `)
            .eq("id", userId)
            .single();

        const roleName =
            data.role.role_name;

        if (!roles.includes(roleName)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
};