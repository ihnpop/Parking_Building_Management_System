import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getParkingSessions } from '../../service/parkingApi';
import "./Topbar.css";

export default function Topbar({ title, showExtras = false, currentTab }) {
    const { user, userRole, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // State quản lý thông báo xe ra/vào
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [readNotifIds, setReadNotifIds] = useState(() => {
        try {
            const saved = localStorage.getItem('read_parking_notif_ids');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const notifDropdownRef = useRef(null);

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

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Hàm lấy danh sách phiên gửi xe & tạo thông báo Xe vào / Xe ra
    const fetchNotifications = async () => {
        try {
            const res = await getParkingSessions();
            if (res?.success && Array.isArray(res.sessions)) {
                const newNotifs = [];
                res.sessions.forEach(session => {
                    const plate = session.plate_number || session.plate || 'K-XĐ';
                    // Xe vào bãi
                    if (session.entry_time) {
                        newNotifs.push({
                            id: `entry_${session.session_id}`,
                            type: 'ENTRY',
                            plate,
                            time: session.entry_time,
                        });
                    }
                    // Xe ra bãi
                    if (session.exit_time) {
                        newNotifs.push({
                            id: `exit_${session.session_id}`,
                            type: 'EXIT',
                            plate,
                            time: session.exit_time,
                        });
                    }
                });

                // Sắp xếp thông báo mới nhất lên trên
                newNotifs.sort((a, b) => new Date(b.time) - new Date(a.time));
                setNotifications(newNotifs.slice(0, 30));
            }
        } catch (err) {
            console.error('[Topbar] Lỗi tải thông báo xe:', err);
        }
    };

    // Lắng nghe sự kiện Check-in/Out thực tế & Polling định kỳ mỗi 6 giây
    useEffect(() => {
        fetchNotifications();

        const timer = setInterval(() => {
            fetchNotifications();
        }, 6000);

        const handleVehicleChange = () => {
            fetchNotifications();
        };

        window.addEventListener('vehicle-session-change', handleVehicleChange);

        return () => {
            clearInterval(timer);
            window.removeEventListener('vehicle-session-change', handleVehicleChange);
        };
    }, []);

    // Đánh dấu tất cả thông báo là đã đọc
    const handleMarkAllRead = () => {
        const allIds = notifications.map(n => n.id);
        const updatedRead = Array.from(new Set([...readNotifIds, ...allIds]));
        setReadNotifIds(updatedRead);
        try {
            localStorage.setItem('read_parking_notif_ids', JSON.stringify(updatedRead));
        } catch (e) {
            console.error(e);
        }
    };

    // Đánh dấu 1 thông báo cụ thể là đã đọc
    const handleMarkSingleRead = (id) => {
        if (!readNotifIds.includes(id)) {
            const updatedRead = [...readNotifIds, id];
            setReadNotifIds(updatedRead);
            try {
                localStorage.setItem('read_parking_notif_ids', JSON.stringify(updatedRead));
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Số lượng thư/thông báo chưa đọc
    const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

    // Helper định dạng thời gian cho thông báo
    const formatNotifTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            let val = timeStr;
            if (typeof val === 'string' && !val.endsWith('Z') && !val.match(/[+-]\d{2}(:\d{2})?$/)) {
                val += 'Z';
            }
            const d = new Date(val);
            if (isNaN(d.getTime())) return timeStr;
            return d.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return timeStr;
        }
    };

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

    return (
        <header className="header">
            <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 className="page-title">{title}</h1>
            </div>

            <div className="header-right-group">
                {isDashboard && (
                    <div className="db-status-badge">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        CSDL trực tuyến
                    </div>
                )}

                {/* Nút Chuông Thông Báo Xe Ra/Vào */}
                <div className="notif-wrapper" ref={notifDropdownRef}>
                    <button
                        type="button"
                        className="bell-btn"
                        aria-label="Thông báo xe ra/vào"
                        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {/* Chấm đỏ / Badge hiển thị số thư chưa đọc */}
                        {unreadCount > 0 && (
                            <span className="bell-badge-dot" title={`${unreadCount} thông báo chưa đọc`}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Modal/Dropdown Menu Danh Sách Thông Báo Xe Ra/Vào */}
                    {showNotifDropdown && (
                        <div className="notif-dropdown">
                            <div className="notif-header">
                                <div className="notif-header-title">
                                    <span className="material-symbols-outlined">notifications</span>
                                    <span>Thông báo xe ra/vào</span>
                                    {unreadCount > 0 && (
                                        <span className="notif-count-badge">{unreadCount} mới</span>
                                    )}
                                </div>
                                {notifications.length > 0 && unreadCount > 0 && (
                                    <button type="button" className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                                        Đánh dấu đã đọc
                                    </button>
                                )}
                            </div>

                            <div className="notif-list">
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">
                                        <span className="material-symbols-outlined">notifications_off</span>
                                        <p>Chưa có thông báo xe ra/vào mới</p>
                                    </div>
                                ) : (
                                    notifications.map(n => {
                                        const isUnread = !readNotifIds.includes(n.id);
                                        return (
                                            <div
                                                key={n.id}
                                                className={`notif-item ${isUnread ? 'unread' : ''}`}
                                                onClick={() => handleMarkSingleRead(n.id)}
                                            >
                                                <div className={`notif-icon ${n.type === 'ENTRY' ? 'entry' : 'exit'}`}>
                                                    <span className="material-symbols-outlined">
                                                        {n.type === 'ENTRY' ? 'login' : 'logout'}
                                                    </span>
                                                </div>
                                                <div className="notif-content">
                                                    <div className="notif-title-row">
                                                        <span className="notif-action-text">
                                                            {n.type === 'ENTRY' ? 'Xe vào bãi' : 'Xe ra bãi'}
                                                        </span>
                                                        <strong className="notif-plate">{n.plate}</strong>
                                                    </div>
                                                    <div className="notif-time">{formatNotifTime(n.time)}</div>
                                                </div>
                                                {isUnread && <span className="notif-unread-dot" />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button type="button" className="bell" aria-label="Trợ giúp">
                    <span className="material-symbols-outlined">help</span>
                </button>

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