import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { getUsers, updateUserRole } from '../../../service/userApi';
import { inviteUser } from '../../../service/cardApi';
import supabase from '../../../config/supabaseClient';
import EditUserDialog from '../components/EditUserDialog';
import InviteUserDialog from '../components/InviteUserDialog';

export default function UserManagementPage() {
    const { userRole } = useAuth();
    const { showConfirm, showToast } = useNotification();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // States for Invite Modal
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        username: '',
        full_name: '',
        phone: '',
        role_id: '',
        building_id: ''
    });

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tất cả');

    // Trạng thái đóng/mở menu lọc xổ dọc
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    // Refs bắt sự kiện loại bỏ click bên ngoài tự động đóng menu
    const filterMenuRef = useRef(null);
    const actionMenuRef = useRef(null);
    const [activeMenuId, setActiveMenuId] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await getUsers();
            const formatted = data.map(u => ({
                id: u.id,
                name: u.full_name || '',
                username: u.username || '',
                email: u.email || '',
                phone: u.phone || '',
                status: u.status || 'Không hoạt động',
                role: u.role?.role_name ? (u.role.role_name.charAt(0) + u.role.role_name.slice(1).toLowerCase()) : 'Staff'
            }));
            setUsers(formatted);
        } catch (error) {
            console.error("Lỗi lấy danh sách user:", error);
            showToast("Không thể tải danh sách người dùng", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRolesAndBuildings = async () => {
        try {
            const { data: roleList, error: roleError } = await supabase.from('role').select('*');
            if (roleError) throw roleError;
            setRoles(roleList || []);

            const { data: buildingList, error: buildingError } = await supabase.from('building').select('*');
            if (buildingError) throw buildingError;
            setBuildings(buildingList || []);

            // Set default roles and buildings in form
            if (roleList && roleList.length > 0) {
                const defaultRole = roleList.find(r => r.role_name.toUpperCase() === 'STAFF') || roleList[0];
                setInviteData(prev => ({ ...prev, role_id: defaultRole.role_id }));
            }
            if (buildingList && buildingList.length > 0) {
                setInviteData(prev => ({ ...prev, building_id: buildingList[0].building_id }));
            }
        } catch (error) {
            console.error("Lỗi tải thông tin role/building:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRolesAndBuildings();
    }, []);

    // Xử lý đóng các menu khi click ra ngoài vùng tương tác
    useEffect(() => {
        function handleClickOutside(event) {
            // Đóng menu hành động ba chấm dọc
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
            // Đóng menu lọc xổ dọc khi click hẳn ra ngoài vùng công cụ
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsFilterExpanded(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesRole = roleFilter === 'Tất cả' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleOpenEdit = (user) => {
        setEditingUser({ ...user });
        setIsEditModalOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const roleNameUpper = editingUser.role.toUpperCase(); // e.g. "ADMIN", "MANAGER", "STAFF"
            await updateUserRole(editingUser.id, roleNameUpper);

            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
            setIsEditModalOpen(false);
            setEditingUser(null);
            showToast("Đã lưu thông tin người dùng thành công!", "success");
        } catch (error) {
            console.error("Lỗi cập nhật vai trò:", error);
            showToast("Lỗi khi cập nhật vai trò: " + (error.response?.data?.message || error.message), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await inviteUser(inviteData);
            showToast(response.message || "Đã gửi lời mời thành công!", "success");

            // Reload user list to show the new user
            fetchUsers();

            // Close modal and reset form
            setIsInviteModalOpen(false);
            setInviteData({
                email: '',
                username: '',
                full_name: '',
                phone: '',
                role_id: roles.find(r => r.role_name.toUpperCase() === 'STAFF')?.role_id || roles[0]?.role_id || '',
                building_id: buildings[0]?.building_id || ''
            });
        } catch (error) {
            console.error("Lỗi khi thêm nhân viên:", error);
            const errMsg = error.response?.data?.message || error.message || "Lỗi khi gửi lời mời";
            showToast(errMsg, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = (userId) => {
        showConfirm({
            title: "Xóa người dùng",
            message: "Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.",
            confirmText: "Xóa bỏ",
            cancelText: "Hủy bỏ",
            isDangerous: true,
            onConfirm: () => {
                setUsers(prev => prev.filter(u => u.id !== userId));
                setActiveMenuId(null);
                showToast("Đã xóa người dùng thành công!", "success");
            }
        });
    };

    return (
        <div className="user-management-container ump-container">

            {/* Khối Banner thông tin */}
            <div className="user-mgmt-banner ump-banner">
                <div className="ump-banner-left">
                    <div className="ump-banner-icon-box">
                        <span className="material-symbols-outlined ump-banner-icon">manage_accounts</span>
                    </div>
                    <div>
                        <h2 className="ump-banner-title">Quản lý phân quyền</h2>
                        <p className="ump-banner-sub">Xem và thay đổi vai trò của từng người dùng trong hệ thống</p>
                    </div>
                </div>
                <div className="ump-banner-right">
                    <span className="ump-banner-count">{users.length}</span>
                    <p className="ump-banner-count-label">Tổng người dùng</p>
                </div>
            </div>

            {/* THANH CÔNG CỤ: Bộ lọc xổ dọc đứng yên khi click chọn vai trò */}
            <div className="user-mgmt-toolbar ump-toolbar">
                <div className="ump-toolbar-left">

                    {/* Ô Tìm Kiếm */}
                    <div className="ump-search-box">
                        <span className="material-symbols-outlined ump-search-icon">search</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên, email, username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="ump-search-input"
                        />
                    </div>

                    {/* KHỐI DROPDOWN LỌC VAI TRÒ XỔ DỌC (ĐÃ SỬA: Ở YÊN KHI CLICK CHỌN) */}
                    <div className="vertical-filter-dropdown-container" ref={filterMenuRef}>
                        <button
                            type="button"
                            className={`main-filter-toggle-btn ump-filter-btn ${isFilterExpanded ? 'active ump-filter-btn--active' : ''}`}
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        >
                            <span className="material-symbols-outlined ump-filter-icon">filter_list</span>
                            Lọc vai trò: <span className="ump-filter-role-highlight">{roleFilter}</span>
                            <span className={`material-symbols-outlined style-arrow-icon ump-filter-arrow ${isFilterExpanded ? 'ump-filter-arrow--open' : ''}`}>keyboard_arrow_down</span>
                        </button>

                        {/* Danh sách xổ dọc nổi đè lên trên nội dung */}
                        {isFilterExpanded && (
                            <div className="vertical-role-dropdown-menu">
                                {['Tất cả', 'Admin', 'Manager', 'Staff'].map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => {
                                            setRoleFilter(role); // Thực hiện cập nhật filter nhưng KHÔNG đóng menu tự động
                                        }}
                                        className={`role-dropdown-item-btn ${roleFilter === role ? 'selected' : ''}`}
                                    >
                                        {role === 'Tất cả' ? 'Tất cả vai trò' : role}
                                        {roleFilter === role && <span className="material-symbols-outlined select-check-icon">check</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* NÚT THÊM NHÂN VIÊN (CHỈ HIỂN THỊ VỚI ADMIN) */}
                    {userRole === 'ADMIN' && (
                        <button
                            type="button"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="ump-btn-add-staff"
                        >
                            <span className="material-symbols-outlined ump-btn-add-icon">person_add</span>
                            Thêm nhân viên
                        </button>
                    )}

                </div>
            </div>

            {/* Bảng phân quyền dữ liệu người dùng */}
            <div className="user-mgmt-table-card ump-table-card">
                <table className="ump-table">
                    <thead>
                        <tr className="ump-thead-tr">
                            <th className="ump-th">NGƯỜI DÙNG</th>
                            <th className="ump-th">EMAIL</th>
                            <th className="ump-th">TRẠNG THÁI</th>
                            <th className="ump-th">ROLE HIỆN TẠI</th>
                            <th className="ump-th--center">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                                const avatarClass = user.role === 'Admin' ? 'ump-avatar--admin' : user.role === 'Manager' ? 'ump-avatar--manager' : 'ump-avatar--staff';
                                const roleBadgeClass = user.role === 'Admin' ? 'ump-role-badge--admin' : user.role === 'Manager' ? 'ump-role-badge--manager' : 'ump-role-badge--staff';
                                const isUserActive = user.status === 'Hoạt động';

                                return (
                                    <tr key={user.id} className="ump-tbody-tr">
                                        <td className="ump-td-user">
                                            <div className={`ump-avatar ${avatarClass}`}>
                                                {(user.name || '').split(' ').pop().substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="ump-user-name">{user.name}</div>
                                                <div className="ump-user-username">@{user.username}</div>
                                            </div>
                                        </td>
                                        <td className="ump-td-email">{user.email}</td>
                                        <td className="ump-td-status">
                                            <span className={`ump-status-badge ${isUserActive ? 'ump-status-badge--active' : 'ump-status-badge--inactive'}`}>
                                                <span className={`material-symbols-outlined ump-status-dot ${isUserActive ? 'ump-status-dot--active' : 'ump-status-dot--inactive'}`}>circle</span>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="ump-td-role">
                                            <span className={`ump-role-badge ${roleBadgeClass}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="ump-td-action">
                                            <button
                                                type="button"
                                                className="user-action-dots-btn ump-action-dots-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                                }}
                                            >
                                                <span className="material-symbols-outlined ump-action-dots-icon">more_vert</span>
                                            </button>

                                            {activeMenuId === user.id && (
                                                <div className="user-action-dropdown-menu" ref={actionMenuRef}>
                                                    <button type="button" className="dropdown-action-item edit-item" onClick={() => handleOpenEdit(user)}>
                                                        <span className="material-symbols-outlined">edit</span>
                                                        Chỉnh sửa
                                                    </button>
                                                    <button type="button" className="dropdown-action-item delete-item" onClick={() => handleDeleteUser(user.id)}>
                                                        <span className="material-symbols-outlined">delete</span>
                                                        Xóa bỏ
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" className="ump-empty-td">Không tìm thấy người dùng phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Hộp thoại Modal Popup chỉnh sửa thông tin thành viên */}
            <EditUserDialog
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                }}
                editingUser={editingUser}
                setEditingUser={setEditingUser}
                handleSaveEdit={handleSaveEdit}
            />

            {/* Hộp thoại Modal Popup thêm nhân viên mới */}
            <InviteUserDialog
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                inviteData={inviteData}
                setInviteData={setInviteData}
                roles={roles}
                buildings={buildings}
                handleInviteSubmit={handleInviteSubmit}
                isLoading={isLoading}
            />
        </div>
    );
}