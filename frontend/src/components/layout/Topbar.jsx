import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ title, showExtras = false, currentTab }) {
    const { user, userRole, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const isUserManagementPage = currentTab === 'user-management';
    const isDashboard = currentTab === 'dashboard';

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error(err);
        }
    };

    const userEmail = user?.email || 'admin@parkflow.com';
    const userInitials = userEmail.charAt(0).toUpperCase();

    const isStaff = userRole?.toUpperCase() === 'STAFF';

    return (
        <header className="header">
            <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentTab === 'system' && !isStaff && (
                    <button
                        type="button"
                        onClick={() => navigate('/login/dashboard')}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#ff6b00',
                            padding: '4px',
                            borderRadius: '50%',
                            transition: 'background 0.2s',
                            marginRight: '8px'
                        }}
                        title="Quay lại Bảng điều khiển"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
                    </button>
                )}
                <h1 className="page-title">{title}</h1>
            </div>

            <div className="header-right-group">
                {isDashboard && (
                    <div className="db-status-badge">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        CSDL trực tuyến
                    </div>
                )}

                {showExtras && !isUserManagementPage && !isDashboard && (
                    <>
                        <div className="search">
                            <span className="material-symbols-outlined">search</span>
                            <input type="search" placeholder="Tìm kiếm nhanh (F4)..." />
                        </div>
                        <button type="button" className="bell" aria-label="Thông báo">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <button type="button" className="bell" aria-label="Trợ giúp">
                            <span className="material-symbols-outlined">help</span>
                        </button>
                    </>
                )}

                <div className="avatar-wrapper" ref={dropdownRef}>
                    <div className="avatar" onClick={() => setShowDropdown(!showDropdown)}>
                        {userInitials}
                    </div>

                    {showDropdown && (
                        <div className="user-dropdown">
                            <div className="user-dropdown-info">
                                <div className="user-dropdown-email">{userEmail}</div>
                                <div className="user-dropdown-role">{getRoleLabel(userRole)}</div>
                            </div>
                            <button type="button" className="user-dropdown-item" onClick={handleLogout}>
                                <span className="material-symbols-outlined">logout</span>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}