import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';

export default function UserManagementPage() {
    const { userRole } = useAuth();
    const { showConfirm, showToast } = useNotification();

    // Bảo toàn 100% dữ liệu mẫu và cấu trúc của bạn
    const [users, setUsers] = useState([
        { id: 1, name: 'Nguyễn Văn A', username: 'manager', email: 'manager@gmail.com', phone: '0912345678', status: 'Không hoạt động', role: 'Manager' },
        { id: 2, name: 'Trần Văn B', username: 'staff', email: 'staff@gmail.com', phone: '0987654321', status: 'Không hoạt động', role: 'Staff' },
        { id: 3, name: 'Nguyễn Anh Tuấn', username: 'admin', email: 'admin@gmail.com', phone: '0909090909', status: 'Không hoạt động', role: 'Admin' }
    ]);

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
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'Tất cả' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleOpenEdit = (user) => {
        setEditingUser({ ...user });
        setIsEditModalOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
        setIsEditModalOpen(false);
        setEditingUser(null);
        showToast("Đã lưu thông tin người dùng thành công!", "success");
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
        <div className="user-management-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>

            {/* Khối Banner thông tin */}
            <div className="user-mgmt-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid #e1e3e4', borderRadius: '8px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#ffe8d6', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#e65c00', fontSize: '28px' }}>manage_accounts</span>
                    </div>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', fontWeight: '600' }}>Quản lý Phân quyền</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Xem và thay đổi vai trò của từng người dùng trong hệ thống</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', display: 'block', lineHeight: '1' }}>{users.length}</span>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>Tổng người dùng</p>
                </div>
            </div>

            {/* THANH CÔNG CỤ: Bộ lọc xổ dọc đứng yên khi click chọn vai trò */}
            <div className="user-mgmt-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

                    {/* Ô Tìm Kiếm */}
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e1e3e4', borderRadius: '6px', padding: '8px 12px', background: '#fff', width: '320px' }}>
                        <span className="material-symbols-outlined" style={{ color: '#888', marginRight: '8px', fontSize: '20px' }}>search</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên, email, username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* KHỐI DROPDOWN LỌC VAI TRÒ XỔ DỌC (ĐÃ SỬA: Ở YÊN KHI CLICK CHỌN) */}
                    <div className="vertical-filter-dropdown-container" ref={filterMenuRef}>
                        <button
                            type="button"
                            className={`main-filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
                                border: '1px solid #e1e3e4', borderRadius: '6px', background: isFilterExpanded ? '#ffe8d6' : '#fff',
                                color: isFilterExpanded ? '#e65c00' : '#555', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_list</span>
                            Lọc vai trò: <span style={{ color: '#e65c00', marginLeft: '2px' }}>{roleFilter}</span>
                            <span className="material-symbols-outlined style-arrow-icon" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: isFilterExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>keyboard_arrow_down</span>
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

                </div>
            </div>

            {/* Bảng phân quyền dữ liệu người dùng */}
            <div className="user-mgmt-table-card" style={{ border: '1px solid #e1e3e4', borderRadius: '8px', padding: '15px', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee', textAlign: 'left', color: '#666', fontSize: '0.85rem' }}>
                            <th style={{ padding: '12px' }}>NGƯỜI DÙNG</th>
                            <th style={{ padding: '12px' }}>EMAIL</th>
                            <th style={{ padding: '12px' }}>TRẠNG THÁI</th>
                            <th style={{ padding: '12px' }}>ROLE HIỆN TẠI</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #eee', fontSize: '0.95rem' }}>
                                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '5px', backgroundColor: user.role === 'Admin' ? '#d1e7dd' : user.role === 'Manager' ? '#f8d7da' : '#eee',
                                            color: user.role === 'Admin' ? '#0f5132' : user.role === 'Manager' ? '#842029' : '#333',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
                                        }}>
                                            {user.name.split(' ').pop().substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#333' }}>{user.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>@{user.username}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', color: '#555' }}>{user.email}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            color: user.status === 'Hoạt động' ? '#0f5132' : '#888',
                                            fontWeight: user.status === 'Hoạt động' ? '600' : '500', fontSize: '0.85rem'
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: user.status === 'Hoạt động' ? '#198754' : '#ccc' }}>circle</span>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                                            backgroundColor: user.role === 'Admin' ? '#f8d7da' : user.role === 'Manager' ? '#fff3cd' : '#e2e3e5',
                                            color: user.role === 'Admin' ? '#842029' : user.role === 'Manager' ? '#664d03' : '#383d41'
                                        }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center', position: 'relative' }}>
                                        <button
                                            type="button"
                                            className="user-action-dots-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
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
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Không tìm thấy người dùng phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Hộp thoại Modal Popup chỉnh sửa thông tin thành viên */}
            {isEditModalOpen && editingUser && (
                <div className="user-management-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="user-management-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="user-modal-header">
                            <h3>Cập nhật thành viên</h3>
                            <button type="button" className="modal-close-x-btn" onClick={() => setIsEditModalOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="user-modal-form-body">
                            <div className="user-modal-input-group">
                                <label>Họ và tên người dùng</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="user-modal-input-group">
                                <label>Địa chỉ Email</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="user-modal-input-group">
                                <label>Số điện thoại</label>
                                <input
                                    type="text"
                                    placeholder="Nhập số điện thoại..."
                                    value={editingUser.phone || ''}
                                    onChange={(e) => setEditingUser(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>

                            <div className="user-modal-input-group">
                                <label>Phân quyền vai trò (Role)</label>
                                <div className="modal-select-styled-wrapper">
                                    <select
                                        value={editingUser.role}
                                        onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Staff">Staff</option>
                                    </select>
                                </div>
                            </div>

                            <div className="user-modal-input-group">
                                <label>Trạng thái tài khoản</label>
                                <div className="modal-select-styled-wrapper">
                                    <select
                                        value={editingUser.status}
                                        onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="Hoạt động">Hoạt động</option>
                                        <option value="Không hoạt động">Không hoạt động</option>
                                    </select>
                                </div>
                            </div>

                            <div className="user-modal-footer-actions">
                                <button type="button" className="user-modal-btn cancel" onClick={() => setIsEditModalOpen(false)}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className="user-modal-btn submit">
                                    Xác nhận lưu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}