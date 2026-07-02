import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getParkingStats, getParkingSessions } from '../../../service/parkingApi';

export default function OccupancyChart() {
    const { user, userRole, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Stats & Sessions state
    const [stats, setStats] = useState({ insideCount: 0, inCount: 0, outCount: 0 });
    const [sessions, setSessions] = useState([]);
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'INSIDE', 'OUT'
    const [now, setNow] = useState(new Date());
    const [loading, setLoading] = useState(false);

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    const fetchStats = async () => {
        try {
            const statsRes = await getParkingStats();
            console.log('[OccupancyChart] statsRes:', statsRes);
            if (statsRes.success) {
                setStats({
                    insideCount: statsRes.insideCount || 0,
                    inCount: statsRes.inCount || 0,
                    outCount: statsRes.outCount || 0
                });
            }
        } catch (err) {
            console.error('[OccupancyChart] Error fetching stats:', err?.response?.data || err.message);
        }
    };

    const fetchSessions = async () => {
        try {
            const sessionsRes = await getParkingSessions();
            console.log('[OccupancyChart] sessionsRes:', sessionsRes);
            if (sessionsRes.success) {
                setSessions(sessionsRes.sessions || []);
            }
        } catch (err) {
            console.error('[OccupancyChart] Error fetching sessions:', err?.response?.data || err.message);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        await Promise.allSettled([fetchStats(), fetchSessions()]);
        setLoading(false);
    };

    // Mount logic: load data + set up auto-refresh polling every 5s + clock every 1s + refresh on tab focus
    useEffect(() => {
        fetchData();

        // Auto-refresh every 5 seconds
        const dataPoll = setInterval(() => {
            fetchSessions();
            fetchStats();
        }, 5000);

        // Clock tick every 1 second
        const clockTick = setInterval(() => {
            setNow(new Date());
        }, 1000);

        // Refresh immediately when user returns to this tab/page
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(dataPoll);
            clearInterval(clockTick);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


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
        <section className="stats-dashboard-page">
            {/* Top Navigation Header */}
            <header className="stats-top-bar">
                <button className="stats-back-btn" onClick={() => navigate('/login/dashboard')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Quay lại
                </button>
                <h1 className="stats-page-title">Thống kê hoạt động bãi xe</h1>
                <div className="stats-header-right">
                    <button className="stats-bell-btn" onClick={fetchData} title="Làm mới dữ liệu">
                        <span className="material-symbols-outlined" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
                    </button>

                    <div className="avatar-wrapper" ref={dropdownRef}>
                        <div className="stats-profile" onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer' }}>
                            <div className="profile-text">
                                <span className="profile-name">{userEmail}</span>
                            </div>
                            <div className="profile-avatar">{userInitials[0]}</div>
                        </div>

                        {showDropdown && (
                            <div className="user-dropdown" style={{ top: '50px' }}>
                                <div className="user-dropdown-info">
                                    <div className="user-dropdown-email">{userEmail}</div>
                                    <div className="user-dropdown-role">{getRoleLabel(userRole)}</div>
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

            <div className="stats-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
                
                {/* 3 Stats Cards Grid */}
                <div className="stats-grid">
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Số lượng xe trong bãi</p>
                            <p className="stat-value">{stats.insideCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-primary">
                            <span className="material-symbols-outlined">local_parking</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã vào</p>
                            <p className="stat-value">{stats.inCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-secondary">
                            <span className="material-symbols-outlined">login</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã ra</p>
                            <p className="stat-value">{stats.outCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-tertiary">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                    </article>
                </div>

                {/* Real-time Parking Sessions List Card */}
                <div className="system-sessions-card">
                    <header className="system-sessions-header">
                        <h3>
                            <span className="material-symbols-outlined">analytics</span>
                            Danh sách hoạt động bãi xe
                        </h3>
                        <div className="system-sessions-filters">
                            <button
                                type="button"
                                className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
                                onClick={() => setFilterType('ALL')}
                            >
                                Tất cả
                            </button>
                            <button
                                type="button"
                                className={`filter-btn ${filterType === 'INSIDE' ? 'active' : ''}`}
                                onClick={() => setFilterType('INSIDE')}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>login</span>
                                Xe đang gửi
                            </button>
                            <button
                                type="button"
                                className={`filter-btn ${filterType === 'OUT' ? 'active' : ''}`}
                                onClick={() => setFilterType('OUT')}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }}>logout</span>
                                Xe đã ra
                            </button>
                        </div>
                    </header>
                    <div className="system-sessions-table-wrapper">
                        <table className="system-sessions-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Biển số xe</th>
                                    <th>Loại vé / Thẻ</th>
                                    <th>Thời gian vào</th>
                                    <th>Thời gian ra</th>
                                    <th>Thời gian gửi</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtered = sessions.filter(session => {
                                        if (filterType === 'INSIDE') return session.status === 'Đang gửi xe';
                                        if (filterType === 'OUT') return session.status === 'Hoàn thành';
                                        return true;
                                    });
                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '24px 0' }}>
                                                    Không có dữ liệu phiên gửi xe nào phù hợp.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return filtered.map((session, index) => {
                                        const isInside = session.status === 'Đang gửi xe';
                                        
                                        // Calculate duration in ms
                                        let durationMs = 0;
                                        if (isInside) {
                                            let entryTimeStr = session.entry_time;
                                            if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
                                                entryTimeStr += "Z";
                                            }
                                            durationMs = now.getTime() - new Date(entryTimeStr).getTime();
                                        } else {
                                            let entryTimeStr = session.entry_time;
                                            let exitTimeStr = session.exit_time;
                                            if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
                                                entryTimeStr += "Z";
                                            }
                                            if (typeof exitTimeStr === "string" && !exitTimeStr.endsWith("Z") && !exitTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
                                                exitTimeStr += "Z";
                                            }
                                            durationMs = new Date(exitTimeStr).getTime() - new Date(entryTimeStr).getTime();
                                        }
                                        
                                        // Format duration
                                        if (durationMs < 0) durationMs = 0;
                                        const seconds = Math.floor((durationMs / 1000) % 60);
                                        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
                                        const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                        const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                                        return (
                                            <tr key={session.session_id}>
                                                <td>{index + 1}</td>
                                                <td style={{ fontWeight: 'bold', color: '#1e293b' }}>{session.plate_number}</td>
                                                <td>
                                                    {session.card ? (
                                                        <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
                                                            <strong>{session.card.code}</strong>
                                                            <span style={{ fontSize: 11, color: '#64748b' }}>{session.card.type}</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>Không rõ thẻ</span>
                                                    )}
                                                </td>
                                                <td>{new Date(session.entry_time).toLocaleString('vi-VN')}</td>
                                                <td>{session.exit_time ? new Date(session.exit_time).toLocaleString('vi-VN') : '-- : --'}</td>
                                                <td>
                                                    <div className={`realtime-timer ${isInside ? '' : 'stopped'}`}>
                                                        <span className="material-symbols-outlined timer-icon">
                                                            {isInside ? 'schedule' : 'hourglass_empty'}
                                                        </span>
                                                        {durationStr}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`session-status-badge ${isInside ? 'inside' : 'out'}`}>
                                                        <span className="badge-dot"></span>
                                                        {isInside ? 'Đang gửi' : 'Đã ra'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </section >
    );
}
