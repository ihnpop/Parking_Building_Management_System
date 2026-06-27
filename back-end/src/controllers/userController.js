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

const getInitials = (name) => {
  if (!name) return "UK";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getDeviceIcon = (device) => {
  if (!device) return 'public';
  const dLower = device.toLowerCase();
  if (dLower.includes('ios') || dLower.includes('android') || dLower.includes('phone') || dLower.includes('iphone')) {
    return 'phone_iphone';
  }
  if (dLower.includes('windows') || dLower.includes('mac') || dLower.includes('linux')) {
    return 'desktop_windows';
  }
  return 'public';
};

export const getLoginLogs = async (req, res) => {
    try {
        const { data: logs, error } = await supabase
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
            .order("login_time", { ascending: false })
            .limit(100);

        if (error) {
            return res.status(400).json({ message: error.message });
        }

        if (!logs || logs.length === 0) {
            return res.json([]);
        }

        // Manual join for profiles to get full_name and role_name
        const profileIds = [...new Set(logs.map(item => item.profiles_id).filter(Boolean))];
        let profileMap = {};
        if (profileIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, role_id")
                .in("id", profileIds);

            if (profiles) {
                const roleIds = [...new Set(profiles.map(p => p.role_id).filter(Boolean))];
                let roleMap = {};
                if (roleIds.length > 0) {
                    const { data: roles } = await supabase
                        .from("role")
                        .select("role_id, role_name")
                        .in("role_id", roleIds);
                    if (roles) {
                        roles.forEach(r => {
                            roleMap[r.role_id] = r.role_name;
                        });
                    }
                }

                profiles.forEach(p => {
                    profileMap[p.id] = {
                        fullName: p.full_name,
                        role: roleMap[p.role_id] || "STAFF"
                    };
                });
            }
        }

        const formattedLogs = logs.map((item, idx) => {
            const profile = profileMap[item.profiles_id];
            const fullName = profile?.fullName || item.username;
            const initials = getInitials(fullName);

            let displayRole = "Nhân viên";
            if (profile?.role) {
                const roleName = profile.role.toUpperCase();
                if (roleName === "ADMIN") {
                    displayRole = "Admin";
                } else if (roleName === "MANAGER") {
                    displayRole = "Quản lý";
                } else {
                    displayRole = "Nhân viên";
                }
            }

            return {
                timestamp: new Date(item.login_time).toLocaleString("vi-VN"),
                username: fullName,
                initials,
                role: displayRole,
                ip: item.ip_address || "Unknown",
                device: item.device_browser || "Unknown Device",
                deviceIcon: getDeviceIcon(item.device_browser),
                location: item.location || "Hà Nội, VN",
                status: item.status
            };
        });

        return res.json(formattedLogs);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
