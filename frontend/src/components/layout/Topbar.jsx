// Import useState: quản lý trạng thái hiển thị dropdown user và dropdown thông báo
// Import useRef: tham chiếu DOM để phát hiện click ngoài dropdown
// Import useEffect: đăng ký/hủy sự kiện click toàn cục và polling thông báo
import { useState, useRef, useEffect } from 'react';
// Import useNavigate để điều hướng sau khi đăng xuất
import { useNavigate } from 'react-router-dom';
// Import useAuth để đọc thông tin user, role và hàm logout
import { useAuth } from '../../context/AuthContext';
// Import API lấy danh sách phiên gửi xe (để hiển thị thông báo xe ra/vào)
import { getParkingSessions } from '../../service/parkingApi';
// Import CSS riêng của Topbar
import "./Topbar.css";

// Topbar: thanh header phía trên giao diện dashboard
// Props: title (tiêu đề trang), showExtras (hiển thị thêm thành phần phụ), currentTab (tab đang active)
export default function Topbar({ title, showExtras = false, currentTab }) {
    // Lấy thông tin user, role và hàm logout từ AuthContext
    const { user, userRole, logout } = useAuth();
    // Hook điều hướng sau khi logout
    const navigate = useNavigate();
    // State kiểm soát hiển thị dropdown menu user (true = đang mở)
    const [showDropdown, setShowDropdown] = useState(false);
    // Ref trỏ tới container dropdown user để phát hiện click bên ngoài
    const dropdownRef = useRef(null);

    // State quản lý thông báo xe ra/vào
    // State kiểm soát hiển thị dropdown thông báo
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    // State lưu danh sách thông báo xe ra/vào
    const [notifications, setNotifications] = useState([]);
    // State lưu danh sách ID các thông báo đã đọc (đọc từ localStorage để duy trì qua reload)
    const [readNotifIds, setReadNotifIds] = useState(() => {
        try {
            const saved = localStorage.getItem('read_parking_notif_ids');
            return saved ? JSON.parse(saved) : []; // Parse mảng đã lưu hoặc mảng rỗng nếu chưa có
        } catch {
            return []; // Fallback về mảng rỗng nếu parse lỗi
        }
    });
    // Ref trỏ tới container dropdown thông báo để phát hiện click bên ngoài
    const notifDropdownRef = useRef(null);

    // Boolean kiểm tra có đang ở tab user-management không (để ẩn/hiện một số UI phụ)
    const isUserManagementPage = currentTab === 'user-management';
    // Boolean kiểm tra có đang ở tab dashboard không (để hiển thị badge trạng thái CSDL)
    const isDashboard = currentTab === 'dashboard';

    // Hàm chuyển role code sang nhãn tiếng Việt hiển thị trên dropdown
    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    // Đóng dropdown khi click bên ngoài vùng dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            // Nếu click ra ngoài vùng dropdownRef thì đóng dropdown user
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            // Nếu click ra ngoài vùng notifDropdownRef thì đóng dropdown thông báo
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        }
        // Đăng ký sự kiện mousedown trên toàn document
        document.addEventListener('mousedown', handleClickOutside);
        // Cleanup: hủy sự kiện khi component unmount
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Hàm lấy danh sách phiên gửi xe & tạo thông báo Xe vào / Xe ra
    const fetchNotifications = async () => {
        try {
            // Gọi API lấy tất cả phiên gửi xe
            const res = await getParkingSessions();
            if (res?.success && Array.isArray(res.sessions)) {
                const newNotifs = [];
                res.sessions.forEach(session => {
                    // Lấy biển số xe, fallback về 'K-XĐ' (không xác định) nếu thiếu
                    const plate = session.plate_number || session.plate || 'K-XĐ';
                    // Xe vào bãi
                    if (session.entry_time) {
                        newNotifs.push({
                            id: `entry_${session.session_id}`, // ID duy nhất cho thông báo vào
                            type: 'ENTRY',  // Loại sự kiện: xe vào
                            plate,
                            time: session.entry_time, // Thời gian vào
                        });
                    }
                    // Xe ra bãi
                    if (session.exit_time) {
                        newNotifs.push({
                            id: `exit_${session.session_id}`, // ID duy nhất cho thông báo ra
                            type: 'EXIT',   // Loại sự kiện: xe ra
                            plate,
                            time: session.exit_time, // Thời gian ra
                        });
                    }
                });

                // Sắp xếp thông báo mới nhất lên trên (sort giảm dần theo thời gian)
                newNotifs.sort((a, b) => new Date(b.time) - new Date(a.time));
                // Giới hạn chỉ giữ 30 thông báo mới nhất để tránh tràn bộ nhớ
                setNotifications(newNotifs.slice(0, 30));
            }
        } catch (err) {
            console.error('[Topbar] Lỗi tải thông báo xe:', err);
        }
    };

    // Lắng nghe sự kiện Check-in/Out thực tế & Polling định kỳ mỗi 6 giây
    useEffect(() => {
        // Tải thông báo ngay khi component mount
        fetchNotifications();

        // Đặt timer polling: gọi API lấy thông báo mới mỗi 6 giây
        const timer = setInterval(() => {
            fetchNotifications();
        }, 6000);

        // Lắng nghe event 'vehicle-session-change' được dispatch khi có xe check-in/out
        const handleVehicleChange = () => {
            fetchNotifications(); // Tải lại thông báo ngay lập tức
        };

        window.addEventListener('vehicle-session-change', handleVehicleChange);

        // Cleanup: hủy timer và event listener khi component unmount
        return () => {
            clearInterval(timer);
            window.removeEventListener('vehicle-session-change', handleVehicleChange);
        };
    }, []);

    // Đánh dấu tất cả thông báo là đã đọc
    const handleMarkAllRead = () => {
        // Lấy tất cả ID của thông báo hiện tại
        const allIds = notifications.map(n => n.id);
        // Merge với danh sách đã đọc cũ, loại bỏ trùng lặp bằng Set
        const updatedRead = Array.from(new Set([...readNotifIds, ...allIds]));
        setReadNotifIds(updatedRead);
        try {
            // Lưu vào localStorage để duy trì qua reload trang
            localStorage.setItem('read_parking_notif_ids', JSON.stringify(updatedRead));
        } catch (e) {
            console.error(e);
        }
    };

    // Đánh dấu 1 thông báo cụ thể là đã đọc khi người dùng click vào nó
    const handleMarkSingleRead = (id) => {
        // Chỉ thêm nếu chưa có trong danh sách đã đọc
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

    // Số lượng thư/thông báo chưa đọc (lọc những ID không nằm trong readNotifIds)
    const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

    // Helper định dạng thời gian cho thông báo sang dạng đọc được tiếng Việt
    const formatNotifTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            let val = timeStr;
            // Đảm bảo chuỗi thời gian có timezone suffix (thêm 'Z' nếu thiếu) để parse đúng UTC
            if (typeof val === 'string' && !val.endsWith('Z') && !val.match(/[+-]\d{2}(:\d{2})?$/)) {
                val += 'Z';
            }
            const d = new Date(val);
            // Trả về chuỗi gốc nếu parse thất bại
            if (isNaN(d.getTime())) return timeStr;
            // Format sang dạng giờ:phút:giây ngày/tháng/năm theo locale Việt Nam
            return d.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return timeStr; // Fallback về chuỗi gốc nếu có lỗi
        }
    };

    // Hàm đăng xuất: gọi logout() rồi điều hướng về trang login
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // Điều hướng về trang đăng nhập
        } catch (err) {
            console.error(err);
        }
    };

    // Email người dùng hiện tại, fallback về email demo nếu chưa đăng nhập
    const userEmail = user?.email || 'admin@parkflow.com';
    // Chữ cái đầu của email dùng làm avatar (viết hoa)
    const userInitials = userEmail.charAt(0).toUpperCase();

    return (
        // header: element thanh header phía trên cùng
        <header className="header">
            {/* Nhóm bên trái: tiêu đề trang */}
            <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Tiêu đề trang hiện tại (truyền từ DashboardShell) */}
                <h1 className="page-title">{title}</h1>
            </div>

            {/* Nhóm bên phải: badge CSDL, chuông thông báo, nút trợ giúp, avatar user */}
            <div className="header-right-group">
                {/* Badge trạng thái CSDL — chỉ hiện ở tab 'dashboard' của Admin */}
                {isDashboard && (
                    <div className="db-status-badge">
                        {/* Chấm xanh lá = CSDL đang trực tuyến */}
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
                        onClick={() => setShowNotifDropdown(!showNotifDropdown)} // Toggle dropdown thông báo
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {/* Chấm đỏ / Badge hiển thị số thư chưa đọc — chỉ hiện khi có thông báo chưa đọc */}
                        {unreadCount > 0 && (
                            <span className="bell-badge-dot" title={`${unreadCount} thông báo chưa đọc`}>
                                {/* Giới hạn hiển thị tối đa "99+" để tránh badge quá rộng */}
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Modal/Dropdown Menu Danh Sách Thông Báo Xe Ra/Vào */}
                    {showNotifDropdown && (
                        <div className="notif-dropdown">
                            {/* Header dropdown thông báo: tiêu đề + số thông báo mới + nút đánh dấu đã đọc */}
                            <div className="notif-header">
                                <div className="notif-header-title">
                                    <span className="material-symbols-outlined">notifications</span>
                                    <span>Thông báo xe ra/vào</span>
                                    {/* Badge số lượng mới — chỉ hiện khi có thông báo chưa đọc */}
                                    {unreadCount > 0 && (
                                        <span className="notif-count-badge">{unreadCount} mới</span>
                                    )}
                                </div>
                                {/* Nút "Đánh dấu đã đọc" — chỉ hiện khi có thông báo và có thông báo chưa đọc */}
                                {notifications.length > 0 && unreadCount > 0 && (
                                    <button type="button" className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                                        Đánh dấu đã đọc
                                    </button>
                                )}
                            </div>

                            {/* Danh sách thông báo */}
                            <div className="notif-list">
                                {notifications.length === 0 ? (
                                    // Trạng thái rỗng: chưa có thông báo nào
                                    <div className="notif-empty">
                                        <span className="material-symbols-outlined">notifications_off</span>
                                        <p>Chưa có thông báo xe ra/vào mới</p>
                                    </div>
                                ) : (
                                    // Render từng thông báo trong danh sách
                                    notifications.map(n => {
                                        // Kiểm tra thông báo này đã đọc chưa
                                        const isUnread = !readNotifIds.includes(n.id);
                                        return (
                                            <div
                                                key={n.id}
                                                // Thêm class 'unread' nếu chưa đọc (để CSS highlight màu khác)
                                                className={`notif-item ${isUnread ? 'unread' : ''}`}
                                                onClick={() => handleMarkSingleRead(n.id)} // Click = đánh dấu đã đọc
                                            >
                                                {/* Icon phân loại xe vào (ENTRY) hay xe ra (EXIT) */}
                                                <div className={`notif-icon ${n.type === 'ENTRY' ? 'entry' : 'exit'}`}>
                                                    <span className="material-symbols-outlined">
                                                        {/* login icon cho xe vào, logout icon cho xe ra */}
                                                        {n.type === 'ENTRY' ? 'login' : 'logout'}
                                                    </span>
                                                </div>
                                                {/* Nội dung thông báo: loại sự kiện, biển số xe, thời gian */}
                                                <div className="notif-content">
                                                    <div className="notif-title-row">
                                                        <span className="notif-action-text">
                                                            {n.type === 'ENTRY' ? 'Xe vào bãi' : 'Xe ra bãi'}
                                                        </span>
                                                        <strong className="notif-plate">{n.plate}</strong>
                                                    </div>
                                                    {/* Thời gian sự kiện đã được format tiếng Việt */}
                                                    <div className="notif-time">{formatNotifTime(n.time)}</div>
                                                </div>
                                                {/* Chấm tròn xanh đánh dấu chưa đọc — chỉ hiện khi isUnread */}
                                                {isUnread && <span className="notif-unread-dot" />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Nút Trợ giúp — hiện tại chưa có chức năng, chỉ là placeholder */}
                <button type="button" className="bell" aria-label="Trợ giúp">
                    <span className="material-symbols-outlined">help</span>
                </button>

                {/* Avatar người dùng + dropdown menu tài khoản */}
                <div className="avatar-wrapper" ref={dropdownRef}>
                    {/* Avatar vòng tròn hiển thị chữ cái đầu email — click để toggle dropdown */}
                    <div className="avatar" onClick={() => setShowDropdown(!showDropdown)}>
                        {userInitials}
                    </div>

                    {/* Dropdown menu thông tin tài khoản — chỉ hiện khi showDropdown = true */}
                    {showDropdown && (
                        <div className="user-dropdown">
                            {/* Hiển thị email và role hiện tại */}
                            <div className="user-dropdown-info">
                                <div className="user-dropdown-email">{userEmail}</div>
                                <div className="user-dropdown-role">{getRoleLabel(userRole)}</div>
                            </div>
                            {/* Nút Đăng xuất trong dropdown */}
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