// Import React và các hookuseState, useEffect, useRef để quản lý UI state và DOM refs
import React, { useState, useEffect, useRef } from 'react';
// Import hook useAuth để kiểm tra thông tin vai trò (userRole) người dùng hiện tại
import { useAuth } from '../../../context/AuthContext';
// Import hook useNotification để gọi các hộp thoại xác nhận và toast thông báo
import { useNotification } from '../../../context/NotificationContext';
// Import các API service xử lý người dùng (lấy danh sách, cập nhật role, cập nhật profile)
import { getUsers, updateUserRole, updateUserProfile } from '../../../service/userApi';
// Import API gửi lời mời nhân viên mới qua Email
import { inviteUser } from '../../../service/cardApi';
// Import Supabase client để query danh sách roles và bãi xe (building)
import supabase from '../../../config/supabaseClient';
// Import Dialog modal chỉnh sửa thông tin người dùng
import EditUserDialog from '../components/EditUserDialog';
// Import Dialog modal mời nhân viên mới
import InviteUserDialog from '../components/InviteUserDialog';
// Import file CSS giao diện riêng của trang quản lý phân quyền
import "./UserManagementPage.css";

// Component chính Trang Quản Lý Phân Quyền & Người Dùng (User Management Page)
export default function UserManagementPage() {
    // Lấy userRole hiện tại từ context (để ẩn/hiện nút Thêm nhân viên)
    const { userRole } = useAuth();
    // Lấy hàm showConfirm (dialog xác nhận xóa) và showToast (thông báo) từ NotificationContext
    const { showConfirm, showToast } = useNotification();

    // State lưu danh sách tất cả người dùng lấy từ database
    const [users, setUsers] = useState([]);
    // State lưu danh sách vai trò (roles: ADMIN, MANAGER, STAFF) lấy từ bảng role
    const [roles, setRoles] = useState([]);
    // State lưu danh sách tòa nhà/bãi xe (building) lấy từ bảng building
    const [buildings, setBuildings] = useState([]);
    // State quản lý trạng thái loading khi gọi API
    const [isLoading, setIsLoading] = useState(false);

    // State lưu dữ liệu form gửi lời mời nhân viên mới (Invite Modal Form State)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        username: '',
        full_name: '',
        phone: '',
        role_id: '',
        building_id: ''
    });

    // State lưu từ khóa tìm kiếm (theo tên, email, username)
    const [search, setSearch] = useState('');
    // State lưu bộ lọc vai trò hiện tại ('Tất cả', 'Admin', 'Manager', 'Staff')
    const [roleFilter, setRoleFilter] = useState('Tất cả');

    // State kiểm soát đóng/mở menu dropdown lọc vai trò
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    // Refs để phát hiện thao tác click bên ngoài (click outside) đóng dropdown menu
    const filterMenuRef = useRef(null);
    const actionMenuRef = useRef(null);
    // State lưu ID của dòng người dùng đang mở menu hành động ba chấm dọc
    const [activeMenuId, setActiveMenuId] = useState(null);

    // State kiểm soát đóng/mở modal chỉnh sửa và dữ liệu user đang được chỉnh sửa
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Hàm gọi API lấy danh sách toàn bộ người dùng hệ thống
    const fetchUsers = async () => {
        try {
            setIsLoading(true); // Bật loading
            const data = await getUsers(); // Gọi API backend
            // Format dữ liệu người dùng chuẩn bị hiển thị trên bảng
            const formatted = data.map(u => ({
                id: u.id,
                name: u.full_name || '',
                username: u.username || '',
                email: u.email || '',
                phone: u.phone || '',
                status: u.status || 'Không hoạt động',
                // Chuyển role_name từ UPPERCASE sang Capitalize (ví dụ: ADMIN -> Admin)
                role: u.role?.role_name ? (u.role.role_name.charAt(0) + u.role.role_name.slice(1).toLowerCase()) : 'Staff',
                buildingName: 'Chưa phân công' // Dữ liệu hiển thị UI mặc định
            }));
            setUsers(formatted); // Cập nhật state users
        } catch (error) {
            console.error("Lỗi lấy danh sách user:", error);
            showToast("Không thể tải danh sách người dùng", "error");
        } finally {
            setIsLoading(false); // Tắt loading
        }
    };

    // Hàm lấy danh sách roles và buildings từ Supabase để điền vào form dropdown
    const fetchRolesAndBuildings = async () => {
        try {
            // Lấy danh sách vai trò
            const { data: roleList, error: roleError } = await supabase.from('role').select('*');
            if (roleError) throw roleError;
            setRoles(roleList || []);

            // Lấy danh sách tòa nhà
            const { data: buildingList, error: buildingError } = await supabase.from('building').select('*');
            if (buildingError) throw buildingError;
            setBuildings(buildingList || []);

            // Thiết lập vai trò và tòa nhà mặc định trong form mời nhân viên
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

    // Trigger tự động fetch dữ liệu người dùng, role và tòa nhà khi mount component lần đầu
    useEffect(() => {
        fetchUsers();
        fetchRolesAndBuildings();
    }, []);

    // Effect lắng nghe sự kiện mouse click ra ngoài để tự động đóng dropdown menu
    useEffect(() => {
        function handleClickOutside(event) {
            // Đóng menu ba chấm của dòng user nếu click ngoài menu
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
            // Đóng menu bộ lọc vai trò nếu click ngoài ô bộ lọc
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsFilterExpanded(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Lọc danh sách người dùng theo từ khóa tìm kiếm và vai trò chọn lọc
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesRole = roleFilter === 'Tất cả' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Mở modal chỉnh sửa thông tin người dùng
    const handleOpenEdit = (user) => {
        setEditingUser({ ...user });
        setIsEditModalOpen(true);
        setActiveMenuId(null);
    };

    // Lưu thông tin chỉnh sửa người dùng (cập nhật role và thông tin cá nhân)
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const roleNameUpper = editingUser.role.toUpperCase(); // Ví dụ: "ADMIN", "MANAGER", "STAFF"

            // Gọi đồng thời cả 2 API: cập nhật role và cập nhật profile
            await Promise.all([
                updateUserRole(editingUser.id, roleNameUpper),
                updateUserProfile(editingUser.id, {
                    full_name: editingUser.name,
                    phone: editingUser.phone,
                    status: editingUser.status,
                })
            ]);

            // Cập nhật lại state mảng users hiển thị
            setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
            setIsEditModalOpen(false); // Đóng modal
            setEditingUser(null);
            showToast("Đã lưu thông tin người dùng thành công!", "success");
        } catch (error) {
            console.error("Lỗi cập nhật thông tin:", error);
            showToast("Lỗi khi cập nhật: " + (error.response?.data?.message || error.message), "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý gửi lời mời nhân viên mới qua email
    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await inviteUser(inviteData); // Gọi API invite
            showToast(response.message || "Đã gửi lời mời thành công!", "success");

            // Tải lại danh sách người dùng để nạp nhân viên vừa mời
            fetchUsers();

            // Đóng modal và reset dữ liệu form
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

    // Xử lý sự kiện nhấn xóa người dùng với hộp thoại xác nhận an toàn
    const handleDeleteUser = (userId) => {
        showConfirm({
            title: "Xóa người dùng",
            message: "Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.",
            confirmText: "Xóa bỏ",
            cancelText: "Hủy bỏ",
            isDangerous: true,
            onConfirm: () => {
                // Xóa người dùng khỏi state local
                setUsers(prev => prev.filter(u => u.id !== userId));
                setActiveMenuId(null);
                showToast("Đã xóa người dùng thành công!", "success");
            }
        });
    };

    return (
        <div className="user-management-container ump-container">

            {/* Khối Banner thông tin tiêu đề và thống kê tổng người dùng */}
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

            {/* THANH CÔNG CỤ: Ô tìm kiếm + Bộ lọc vai trò + Nút Thêm nhân viên */}
            <div className="user-mgmt-toolbar ump-toolbar">
                <div className="ump-toolbar-left">

                    {/* Ô Tìm Kiếm người dùng theo tên, email, username */}
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

                    {/* KHỐI DROPDOWN LỌC VAI TRÒ XỔ DỌC */}
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

                        {/* Menu danh sách chọn vai trò xổ dọc */}
                        {isFilterExpanded && (
                            <div className="vertical-role-dropdown-menu">
                                {['Tất cả', 'Admin', 'Manager', 'Staff'].map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => {
                                            setRoleFilter(role); // Cập nhật roleFilter được chọn
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

                    {/* NÚT THÊM NHÂN VIÊN (chỉ hiển thị khi vai trò đăng nhập là ADMIN) */}
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

            {/* Bảng danh sách thông tin và quyền hạn của người dùng */}
            <div className="user-mgmt-table-card ump-table-card">
                <table className="ump-table">
                    <thead>
                        <tr className="ump-thead-tr">
                            <th className="ump-th">NGƯỜI DÙNG</th>
                            <th className="ump-th">EMAIL</th>
                            <th className="ump-th">TÒA NHÀ</th>
                            <th className="ump-th">TRẠNG THÁI</th>
                            <th className="ump-th">ROLE HIỆN TẠI</th>
                            <th className="ump-th--center">HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                                // Định dạng class màu sắc cho avatar và role badge theo vai trò
                                const avatarClass = user.role === 'Admin' ? 'ump-avatar--admin' : user.role === 'Manager' ? 'ump-avatar--manager' : 'ump-avatar--staff';
                                const roleBadgeClass = user.role === 'Admin' ? 'ump-role-badge--admin' : user.role === 'Manager' ? 'ump-role-badge--manager' : 'ump-role-badge--staff';
                                const isUserActive = user.status === 'Hoạt động';

                                return (
                                    <tr key={user.id} className="ump-tbody-tr">
                                        {/* Cột Tên và avatar đại diện */}
                                        <td className="ump-td-user">
                                            <div className={`ump-avatar ${avatarClass}`}>
                                                {(user.name || '').split(' ').pop().substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="ump-user-name">{user.name}</div>
                                                <div className="ump-user-username">@{user.username}</div>
                                            </div>
                                        </td>
                                        {/* Cột Email */}
                                        <td className="ump-td-email">{user.email}</td>
                                        {/* Cột Tòa nhà phân công */}
                                        <td className="ump-td-building">{user.buildingName}</td>
                                        {/* Cột Trạng thái hoạt động */}
                                        <td className="ump-td-status">
                                            <span className={`ump-status-badge ${isUserActive ? 'ump-status-badge--active' : 'ump-status-badge--inactive'}`}>
                                                <span className={`material-symbols-outlined ump-status-dot ${isUserActive ? 'ump-status-dot--active' : 'ump-status-dot--inactive'}`}>circle</span>
                                                {user.status}
                                            </span>
                                        </td>
                                        {/* Cột Vai trò hiện tại (Role Badge) */}
                                        <td className="ump-td-role">
                                            <span className={`ump-role-badge ${roleBadgeClass}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        {/* Cột Nút Thao Tác (Menu 3 chấm) */}
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

                                            {/* Dropdown Menu Chỉnh sửa / Xóa */}
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
                                <td colSpan="6" className="ump-empty-td">Không tìm thấy người dùng phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Popup Chỉnh sửa thông tin tài khoản & quyền hạn */}
            <EditUserDialog
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                }}
                editingUser={editingUser}
                setEditingUser={setEditingUser}
                buildings={buildings}
                handleSaveEdit={handleSaveEdit}
            />

            {/* Modal Popup Thêm/Mời nhân viên mới vào hệ thống */}
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