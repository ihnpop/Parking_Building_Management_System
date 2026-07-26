import { inviteStaff } from "../service/userService.js";
import * as userRepository from "../repositories/userRepository.js";

/**
 * GET /api/users
 * Lấy danh sách tất cả người dùng kèm thông tin role
 */
export const getUsers = async (req, res) => {
    try {
        const data = await userRepository.getAllProfilesWithRoles();
        return res.json({ data });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

export const inviteUserController = async (req, res) => {
    try {
        const { email, username, full_name, phone, role_id, building_id } =
            req.body;

        if (!email || !username || !full_name || !role_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc (email, username, full_name, role_id)",
            });
        }

        // URL trang custom đặt password trong frontend (đổi domain theo môi trường thực tế)
        const redirectTo = `${process.env.FRONTEND_URL}/set-password`;

        const profile = await inviteStaff({
            email,
            username,
            full_name,
            phone,
            role_id,
            building_id,
            redirectTo,
        });

        return res.status(201).json({
            success: true,
            message: `Đã gửi lời mời tới email ${email}`,
            data: profile,
        });
    } catch (error) {
        console.error("inviteUserController error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi server khi tạo lời mời",
        });
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
        let roleData;
        try {
            roleData = await userRepository.findRoleByName(role_name);
        } catch (roleError) {
            return res.status(404).json({ message: "Không tìm thấy role" });
        }

        if (!roleData) {
            return res.status(404).json({ message: "Không tìm thấy role" });
        }

        // Bước 2: Cập nhật profiles.role_id
        try {
            await userRepository.updateProfileRole(id, roleData.role_id);
        } catch (updateError) {
            return res.status(400).json({ message: updateError.message });
        }

        return res.json({ message: "Cập nhật role thành công" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * PATCH /api/users/:id/profile
 * Cập nhật thông tin cơ bản: phone, full_name, status
 */
export const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone, full_name, status } = req.body;

        const updateData = {};
        if (phone !== undefined) updateData.phone = phone;
        if (full_name !== undefined) updateData.full_name = full_name;
        if (status !== undefined) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Không có dữ liệu nào để cập nhật" });
        }

        const updated = await userRepository.updateProfile(id, updateData);
        return res.json({ message: "Cập nhật thông tin thành công", data: updated });
    } catch (err) {
        console.error("updateUserProfile error:", err);
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
        let logs;
        try {
            logs = await userRepository.getLoginLogs();
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        if (!logs || logs.length === 0) {
            return res.json([]);
        }

        // Manual join for profiles to get full_name and role_name
        const profileIds = [...new Set(logs.map(item => item.profiles_id).filter(Boolean))];
        let profileMap = {};
        if (profileIds.length > 0) {
            const profiles = await userRepository.getProfilesByIds(profileIds);

            if (profiles && profiles.length > 0) {
                const roleIds = [...new Set(profiles.map(p => p.role_id).filter(Boolean))];
                let roleMap = {};
                if (roleIds.length > 0) {
                    const roles = await userRepository.getRolesByIds(roleIds);
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
                login_time: item.login_time,
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
