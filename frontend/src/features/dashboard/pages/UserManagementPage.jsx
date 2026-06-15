import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserRole } from '../../../service/userApi';
import DashboardShell from '../../../components/layout/DashboardShell';

const ROLES = ['ADMIN', 'MANAGER', 'STAFF'];

const ROLE_CONFIG = {
    ADMIN: { label: 'Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: 'admin_panel_settings' },
    MANAGER: { label: 'Manager', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'manage_accounts' },
    STAFF: { label: 'Staff', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: 'badge' },
};

function RoleBadge({ role }) {
    const cfg = ROLE_CONFIG[role] || { label: role, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: 'person' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '999px',
            background: cfg.bg, color: cfg.color,
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em'
        }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{cfg.icon}</span>
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }) {
    const isActive = status === 'ACTIVE';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '999px',
            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)',
            color: isActive ? '#22c55e' : '#94a3b8',
            fontSize: '12px', fontWeight: 600
        }}>
            <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isActive ? '#22c55e' : '#94a3b8',
                display: 'inline-block'
            }} />
            {isActive ? 'Hoạt động' : 'Không hoạt động'}
        </span>
    );
}

function UserAvatar({ name }) {
    const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const hue = [...(name || 'U')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
        <div style={{
            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, hsl(${hue},70%,50%), hsl(${(hue + 60) % 360},70%,40%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
        }}>
            {initials}
        </div>
    );
}

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editRoles, setEditRoles] = useState({});
    const [saving, setSaving] = useState({});
    const [successMsg, setSuccessMsg] = useState({});
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getUsers();
            setUsers(data || []);
            const initialRoles = {};
            (data || []).forEach(u => {
                initialRoles[u.id] = u.role?.role_name || 'STAFF';
            });
            setEditRoles(initialRoles);
        } catch (err) {
            setError('Không thể tải danh sách người dùng. ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleRoleChange = (userId, newRole) => {
        setEditRoles(prev => ({ ...prev, [userId]: newRole }));
        setSuccessMsg(prev => ({ ...prev, [userId]: '' }));
    };

    const handleSave = async (userId) => {
        setSaving(prev => ({ ...prev, [userId]: true }));
        setSuccessMsg(prev => ({ ...prev, [userId]: '' }));
        try {
            await updateUserRole(userId, editRoles[userId]);
            setSuccessMsg(prev => ({ ...prev, [userId]: 'Đã lưu!' }));
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, role: { ...u.role, role_name: editRoles[userId] } }
                    : u
            ));
            setTimeout(() => setSuccessMsg(prev => ({ ...prev, [userId]: '' })), 2000);
        } catch (err) {
            setSuccessMsg(prev => ({ ...prev, [userId]: 'Lỗi: ' + (err.message || '') }));
        } finally {
            setSaving(prev => ({ ...prev, [userId]: false }));
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch =
            (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.username || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === 'ALL' || u.role?.role_name === filterRole;
        return matchSearch && matchRole;
    });

    return (
        <DashboardShell>
            <div style={{ padding: '0 0 40px 0' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,107,0,0.10) 0%, rgba(255,180,100,0.08) 100%)',
                    border: '1px solid rgba(255,107,0,0.20)',
                    borderRadius: '18px', padding: '28px 32px',
                    marginBottom: '28px',
                    display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #ff6b00, #ff9a3c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(255,107,0,0.35)'
                    }}>
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '28px' }}>
                            manage_accounts
                        </span>
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1f2937' }}>
                            Quản lý Phân quyền
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                            Xem và thay đổi vai trò của từng người dùng trong hệ thống
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#ff6b00' }}>
                            {users.length}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Tổng người dùng</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex', gap: '12px', marginBottom: '20px',
                    flexWrap: 'wrap', alignItems: 'center'
                }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <span className="material-symbols-outlined" style={{
                            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                            color: '#64748b', fontSize: '20px', pointerEvents: 'none'
                        }}>search</span>
                        <input
                            id="user-search"
                            type="text"
                            placeholder="Tìm kiếm tên, email, username..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 16px 10px 42px',
                                background: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: '10px', color: '#1f2937', fontSize: '14px',
                                outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['ALL', ...ROLES].map(r => {
                            const cfg = r === 'ALL' ? null : ROLE_CONFIG[r];
                            const active = filterRole === r;
                            return (
                                <button
                                    key={r}
                                    id={`filter-role-${r.toLowerCase()}`}
                                    onClick={() => setFilterRole(r)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                        border: active ? `1px solid ${cfg?.color || '#ff6b00'}` : '1px solid #e5e7eb',
                                        background: active ? (cfg?.bg || 'rgba(255,107,0,0.12)') : '#ffffff',
                                        color: active ? (cfg?.color || '#ff6b00') : '#6b7280',
                                        fontSize: '13px', fontWeight: active ? 700 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {r === 'ALL' ? 'Tất cả' : cfg.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        id="refresh-users-btn"
                        onClick={fetchUsers}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                                border: '1px solid #ffdecc',
                                background: '#ffffff', color: '#6b7280',
                                fontSize: '13px', transition: 'all 0.2s'
                            }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                        Làm mới
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
                        color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px'
                    }}>
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div style={{
                        textAlign: 'center', padding: '60px',
                        color: '#64748b', fontSize: '16px'
                    }}>
                        <span className="material-symbols-outlined"
                            style={{ fontSize: '40px', display: 'block', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>
                            progress_activity
                        </span>
                        Đang tải danh sách người dùng...
                    </div>
                ) : (
                    /* Table */
                    <div style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '18px', overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                    }}>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.8fr 1fr 1fr 1.4fr 1fr',
                            padding: '14px 24px',
                            background: '#faf7f2',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '12px', fontWeight: 700, color: '#6b7280',
                            letterSpacing: '0.08em', textTransform: 'uppercase'
                        }}>
                            <div>Người dùng</div>
                            <div>Email</div>
                            <div>Trạng thái</div>
                            <div>Role hiện tại</div>
                            <div>Thay đổi Role</div>
                            <div>Hành động</div>
                        </div>

                        {/* Table Body */}
                        {filteredUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>
                                    person_off
                                </span>
                                Không tìm thấy người dùng nào
                            </div>
                        ) : (
                            filteredUsers.map((user, idx) => {
                                const currentRole = user.role?.role_name || 'STAFF';
                                const selectedRole = editRoles[user.id] || currentRole;
                                const hasChanged = selectedRole !== currentRole;
                                const isSaving = saving[user.id];
                                const msg = successMsg[user.id];

                                return (
                                    <div
                                        key={user.id}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1.8fr 1fr 1fr 1.4fr 1fr',
                                            padding: '16px 24px',
                                            borderBottom: idx < filteredUsers.length - 1
                                                ? '1px solid #f3f4f6' : 'none',
                                            alignItems: 'center',
                                            transition: 'background 0.2s',
                                            background: hasChanged ? 'rgba(255,107,0,0.04)' : 'transparent'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = hasChanged ? 'rgba(255,107,0,0.07)' : '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = hasChanged ? 'rgba(255,107,0,0.04)' : 'transparent'}
                                    >
                                        {/* User info */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <UserAvatar name={user.full_name || user.username} />
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>
                                                    {user.full_name || user.username || 'Chưa đặt tên'}
                                                </div>
                                                {user.username && user.full_name && (
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                        @{user.username}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.email || '—'}
                                        </div>

                                        {/* Status */}
                                        <div><StatusBadge status={user.status} /></div>

                                        {/* Current Role */}
                                        <div><RoleBadge role={currentRole} /></div>

                                        {/* Role Selector */}
                                        <div>
                                            <select
                                                id={`role-select-${user.id}`}
                                                value={selectedRole}
                                                onChange={e => handleRoleChange(user.id, e.target.value)}
                                                style={{
                                                    padding: '7px 12px', borderRadius: '8px',
                                                    background: '#ffffff',
                                                    border: hasChanged
                                                        ? '1px solid #ff6b00'
                                                        : '1px solid #d1d5db',
                                                    color: '#1f2937', fontSize: '13px', cursor: 'pointer',
                                                    outline: 'none', width: '130px',
                                                    transition: 'border 0.2s'
                                                }}
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}
                                                        style={{ background: '#ffffff', color: '#1f2937' }}>
                                                        {ROLE_CONFIG[r].label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Save Button */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                id={`save-role-btn-${user.id}`}
                                                onClick={() => handleSave(user.id)}
                                                disabled={!hasChanged || isSaving}
                                                style={{
                                                    padding: '7px 14px', borderRadius: '8px',
                                                    background: hasChanged && !isSaving
                                                        ? 'linear-gradient(135deg, #ff6b00, #ff9a3c)'
                                                        : '#f3f4f6',
                                                    border: 'none', color: hasChanged ? '#fff' : '#9ca3af',
                                                    fontSize: '13px', fontWeight: 600, cursor: hasChanged ? 'pointer' : 'default',
                                                    transition: 'all 0.2s',
                                                    opacity: isSaving ? 0.7 : 1,
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    boxShadow: hasChanged ? '0 2px 10px rgba(255,107,0,0.30)' : 'none'
                                                }}
                                            >
                                                {isSaving ? (
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>
                                                        progress_activity
                                                    </span>
                                                ) : (
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                                        {msg === 'Đã lưu!' ? 'check_circle' : 'save'}
                                                    </span>
                                                )}
                                                {isSaving ? 'Đang lưu...' : msg === 'Đã lưu!' ? 'Đã lưu!' : 'Lưu'}
                                            </button>
                                            {msg && msg !== 'Đã lưu!' && (
                                                <span style={{ fontSize: '12px', color: '#fca5a5' }}>{msg}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Stats footer */}
                {!loading && filteredUsers.length > 0 && (
                    <div style={{
                        marginTop: '16px', display: 'flex', gap: '16px',
                        flexWrap: 'wrap'
                    }}>
                        {ROLES.map(r => {
                            const count = users.filter(u => u.role?.role_name === r).length;
                            const cfg = ROLE_CONFIG[r];
                            return (
                                <div key={r} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 14px', borderRadius: '10px',
                                    background: cfg.bg, border: `1px solid ${cfg.color}30`
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: cfg.color }}>
                                        {cfg.icon}
                                    </span>
                                    <span style={{ fontSize: '13px', color: cfg.color, fontWeight: 600 }}>
                                        {cfg.label}: {count}
                                    </span>
                                </div>
                            );
                        })}
                        <div style={{
                            fontSize: '13px', color: '#64748b',
                            display: 'flex', alignItems: 'center'
                        }}>
                            Hiển thị {filteredUsers.length} / {users.length} người dùng
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </DashboardShell>
    );
}
