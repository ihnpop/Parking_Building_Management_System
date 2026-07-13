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
    // selectedDate: 'YYYY-MM-DD' theo giờ địa phương GMT+7
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const selectedDate = todayStr;

    // Column Filters state
    const [columnFilters, setColumnFilters] = useState({
        plate: '',
        cardCode: '',
        cardType: 'ALL',
        entryTime: '',
        exitTime: '',
        duration: '',
        status: 'ALL'
    });

    const isAnyFilterActive = 
        columnFilters.plate !== '' || 
        columnFilters.cardCode !== '' || 
        columnFilters.cardType !== 'ALL' || 
        columnFilters.entryTime !== '' || 
        columnFilters.exitTime !== '' || 
        columnFilters.duration !== '' || 
        columnFilters.status !== 'ALL';

    const handleClearFilters = () => {
        setColumnFilters({
            plate: '',
            cardCode: '',
            cardType: 'ALL',
            entryTime: '',
            exitTime: '',
            duration: '',
            status: 'ALL'
        });
    };

    const filterInputStyle = {
        width: '100%',
        padding: '6px 10px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#1f2937',
        backgroundColor: '#f8fafc',
        outline: 'none',
        transition: 'all 0.15s ease-in-out',
        boxSizing: 'border-box'
    };

    const filterSelectStyle = {
        width: '100%',
        padding: '6px 8px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#1f2937',
        backgroundColor: '#f8fafc',
        outline: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        boxSizing: 'border-box'
    };

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    const fetchStats = async (dateStr) => {
        try {
            const statsRes = await getParkingStats(dateStr);
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

    const fetchSessions = async (dateStr) => {
        try {
            const sessionsRes = await getParkingSessions(dateStr);
            console.log('[OccupancyChart] sessionsRes:', sessionsRes);
            if (sessionsRes.success) {
                setSessions(sessionsRes.sessions || []);
            }
        } catch (err) {
            console.error('[OccupancyChart] Error fetching sessions:', err?.response?.data || err.message);
        }
    };

    const fetchData = async (dateStr) => {
        setLoading(true);
        await Promise.allSettled([fetchStats(dateStr), fetchSessions(dateStr)]);
        setLoading(false);
    };

    // Mount logic: load data + auto-refresh polling every 30s + clock every 1s + refresh on tab focus
    useEffect(() => {
        fetchData(selectedDate);

        // Auto-refresh mỗi 30 giây với ngày đang chọn
        const dataPoll = setInterval(() => {
            fetchSessions(selectedDate);
            fetchStats(selectedDate);
        }, 30000);

        // Clock tick every 1 second
        const clockTick = setInterval(() => {
            setNow(new Date());
        }, 1000);

        // Refresh immediately when user returns to this tab/page
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData(selectedDate);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(dataPoll);
            clearInterval(clockTick);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [selectedDate]); // Re-run khi ngày thay đổi


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
            <header className="stats-top-bar">
                <button className="stats-back-btn" onClick={() => navigate('/login/dashboard')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Quay lại
                </button>
                <h1 className="stats-page-title">Thống kê hoạt động bãi xe</h1>
                <div className="stats-header-right">

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
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '8px' }}>
                                        {isAnyFilterActive && (
                                            <button
                                                type="button"
                                                onClick={handleClearFilters}
                                                title="Xóa tất cả bộ lọc"
                                                style={{
                                                    background: '#fee2e2',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '4px 6px',
                                                    margin: '0 auto',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    gap: '2px'
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_alt_off</span>
                                                Xóa
                                            </button>
                                        )}
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Lọc biển số..."
                                            value={columnFilters.plate}
                                            onChange={(e) => setColumnFilters({...columnFilters, plate: e.target.value})}
                                            style={filterInputStyle}
                                            onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                        />
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <input
                                                type="text"
                                                placeholder="Lọc mã thẻ..."
                                                value={columnFilters.cardCode}
                                                onChange={(e) => setColumnFilters({...columnFilters, cardCode: e.target.value})}
                                                style={filterInputStyle}
                                                onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                            />
                                            <select
                                                value={columnFilters.cardType}
                                                onChange={(e) => setColumnFilters({...columnFilters, cardType: e.target.value})}
                                                style={filterSelectStyle}
                                                onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                            >
                                                <option value="ALL">Loại: Tất cả</option>
                                                <option value="Thẻ tháng">Thẻ tháng</option>
                                                <option value="Thẻ lượt">Thẻ lượt</option>
                                            </select>
                                        </div>
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Lọc giờ vào..."
                                            value={columnFilters.entryTime}
                                            onChange={(e) => setColumnFilters({...columnFilters, entryTime: e.target.value})}
                                            style={filterInputStyle}
                                            onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                        />
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Lọc giờ ra..."
                                            value={columnFilters.exitTime}
                                            onChange={(e) => setColumnFilters({...columnFilters, exitTime: e.target.value})}
                                            style={filterInputStyle}
                                            onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                        />
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Lọc th.gian..."
                                            value={columnFilters.duration}
                                            onChange={(e) => setColumnFilters({...columnFilters, duration: e.target.value})}
                                            style={filterInputStyle}
                                            onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                        />
                                    </th>
                                    <th style={{ padding: '8px' }}>
                                        <select
                                            value={columnFilters.status}
                                            onChange={(e) => setColumnFilters({...columnFilters, status: e.target.value})}
                                            style={filterSelectStyle}
                                            onFocus={(e) => e.target.style.borderColor = '#a94412'}
                                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                        >
                                            <option value="ALL">Tất cả</option>
                                            <option value="INSIDE">Đang gửi</option>
                                            <option value="OUT">Đã ra</option>
                                        </select>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtered = sessions.filter(session => {
                                        // 1. Top filterType
                                        if (filterType === 'INSIDE' && session.status !== 'Đang gửi xe') return false;
                                        if (filterType === 'OUT' && session.status !== 'Hoàn thành') return false;

                                        // 2. Column: Biển số xe
                                        if (columnFilters.plate && !session.plate_number.toLowerCase().includes(columnFilters.plate.toLowerCase())) {
                                            return false;
                                        }

                                        // 3. Column: Loại vé / Thẻ
                                        const cardType = session.card?.type || 'Thẻ lượt';
                                        if (columnFilters.cardType !== 'ALL' && cardType !== columnFilters.cardType) {
                                            return false;
                                        }
                                        if (columnFilters.cardCode && !(session.card?.code || '').toLowerCase().includes(columnFilters.cardCode.toLowerCase())) {
                                            return false;
                                        }

                                        // 4. Column: Thời gian vào
                                        if (columnFilters.entryTime) {
                                            const entryStr = new Date(session.entry_time).toLocaleString('vi-VN').toLowerCase();
                                            if (!entryStr.includes(columnFilters.entryTime.toLowerCase())) return false;
                                        }

                                        // 5. Column: Thời gian ra
                                        if (columnFilters.exitTime) {
                                            const exitStr = session.exit_time ? new Date(session.exit_time).toLocaleString('vi-VN').toLowerCase() : '-- : --';
                                            if (!exitStr.includes(columnFilters.exitTime.toLowerCase())) return false;
                                        }

                                        // 6. Column: Thời gian gửi (duration)
                                        if (columnFilters.duration) {
                                            const isInside = session.status === 'Đang gửi xe';
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
                                            if (durationMs < 0) durationMs = 0;
                                            const seconds = Math.floor((durationMs / 1000) % 60);
                                            const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
                                            const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                            const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                            
                                            if (!durationStr.includes(columnFilters.duration)) return false;
                                        }

                                        // 7. Column: Trạng thái
                                        if (columnFilters.status !== 'ALL') {
                                            if (columnFilters.status === 'INSIDE' && session.status !== 'Đang gửi xe') return false;
                                            if (columnFilters.status === 'OUT' && session.status !== 'Hoàn thành') return false;
                                        }

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
