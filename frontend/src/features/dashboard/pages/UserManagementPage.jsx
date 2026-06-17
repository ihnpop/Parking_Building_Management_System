import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function UserManagementPage() {
    const { userRole } = useAuth();
    const [users, setUsers] = useState([
        { id: 1, name: 'Nguyễn Văn A', username: 'manager', email: 'manager@gmail.com', status: 'Không hoạt động', role: 'Manager' },
        { id: 2, name: 'Trần Văn B', username: 'staff', email: 'staff@gmail.com', status: 'Không hoạt động', role: 'Staff' },
        { id: 3, name: 'Nguyễn Anh Tuấn', username: 'admin', email: 'admin@gmail.com', status: 'Không hoạt động', role: 'Admin' }
    ]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tất cả');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'Tất cả' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRoleChange = (userId, newRole) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    };

    return (
        <div className="user-management-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>

            {/* Khối Banner thông tin tổng quát */}
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

            {/* THANH TÌM KIẾM VÀ LỌC ĐÃ ĐƯỢC ĐƯA XUỐNG DƯỚI VIEW */}
            <div className="user-mgmt-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e1e3e4', borderRadius: '6px', padding: '8px 12px', background: '#fff', width: '350px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#888', marginRight: '8px', fontSize: '20px' }}>search</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm tên, email, username..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {['Tất cả', 'Admin', 'Manager', 'Staff'].map((role) => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => setRoleFilter(role)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                backgroundColor: roleFilter === role ? '#ffe8d6' : '#fff',
                                color: roleFilter === role ? '#e65c00' : '#555',
                                border: roleFilter === role ? '1px solid #e65c00' : '1px solid #e1e3e4',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {role}
                        </button>
                    ))}
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
                            <th style={{ padding: '12px' }}>THAY ĐỔI ROLE</th>
                            <th style={{ padding: '12px' }}>HÀNH ĐỘNG</th>
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#888', fontSize: '0.85rem' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '10px', color: '#ccc' }}>circle</span>
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
                                    <td style={{ padding: '12px' }}>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.9rem', background: '#fff' }}
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Staff">Staff</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button type="button" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                                            Lưu
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Không tìm thấy người dùng phù hợp</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}