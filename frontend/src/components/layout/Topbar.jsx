import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Topbar component for the dashboard.
 * Displays the page title and user actions on the right.
 */
export default function Topbar({ title, showExtras = false }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
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
            console.error('Logout error:', err);
        }
    };

    // Calculate user initials
    const userEmail = user?.email || 'admin@parkflow.com';
    const userInitials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.substring(0, 2).toUpperCase()
        : userEmail.substring(0, 2).toUpperCase();

    return (
        <header className="topbar">
            <h1>{title}</h1>

            <div className="top-actions">
                {/* 1. Nút Chuông thông báo */}
                <button type="button" className="header-action-btn" aria-label="Thông báo">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="bell-badge-dot"></span>
                </button>

                {/* 2. Nút Bánh răng cài đặt (Luôn hiện) */}
                <button type="button" className="header-action-btn" aria-label="Cài đặt">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="bell-badge-dot"></span>
                </button>

                {/* 3. Nút Trợ giúp chấm hỏi (Luôn hiện) */}
                <button type="button" className="header-action-btn" aria-label="Trợ giúp">
                    <span className="material-symbols-outlined">help</span>
                    <span className="bell-badge-dot"></span>
                </button>

                {/* 4. Khối Avatar viết tắt kết hợp Dropdown bấm để Đăng xuất */}
                <div className="avatar-wrapper" ref={dropdownRef}>
                    <div
                        className="profile-avatar-circle"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        {userInitials}
                    </div>

                    {showDropdown && (
                        <div className="user-dropdown" style={{ top: '50px', right: '0px' }}>
                            <div className="user-dropdown-info">
                                <div className="user-dropdown-email">{userEmail}</div>
                                <div className="user-dropdown-role">Quản trị viên</div>
                            </div>
                            <button
                                type="button"
                                className="user-dropdown-item"
                                onClick={handleLogout}
                            >
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
