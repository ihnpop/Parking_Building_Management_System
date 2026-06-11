import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialLogs = [
    { timestamp: '2023-11-24 14:32:01', username: 'nguyen.lam', initials: 'NL', ip: '192.168.1.45', device: 'Chrome / macOS', deviceIcon: 'desktop_windows', location: 'Hà Nội, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:30:15', username: 'unknown_user', initials: 'UK', ip: '45.12.8.212', device: 'Unknown / Bot', deviceIcon: 'public', location: 'Kyiv, UA', status: 'Failed' },
    { timestamp: '2023-11-24 14:28:44', username: 'tran.hoang', initials: 'TH', ip: '115.23.45.98', device: 'Safari / iOS', deviceIcon: 'tablet_mac', location: 'TP.HCM, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:15:22', username: 'admin_main', initials: 'AD', ip: '10.0.0.5', device: 'Firefox / Windows', deviceIcon: 'laptop', location: 'Hà Nội, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:10:05', username: 'le.van.an', initials: 'LV', ip: '172.16.0.12', device: 'Edge / Windows', deviceIcon: 'desktop_windows', location: 'Đà Nẵng, VN', status: 'Success' },
];

export default function LoginLogPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tất cả vai trò');
    const [logs, setLogs] = useState(initialLogs);

    const handleFilter = () => {
        let filtered = initialLogs.filter((log) => {
            const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase()) ||
                log.ip.toLowerCase().includes(search.toLowerCase()) ||
                log.location.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
        setLogs(filtered);
    };

    return (
        <div className="login-log-page">
            {/* Header dính đỉnh tràn viền đồng nhất hệ thống */}
            <header className="stats-top-bar">
                <div className="top-bar-left">
                    <button type="button" className="cardpage-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>
                </div>

                <h1 className="stats-page-title">Nhật ký đăng nhập</h1>

                <div className="top-bar-right">
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="bell-badge-dot"></span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">settings</span>
                    </button>

                    <div className="header-user-profile">
                        <div className="profile-info-text">
                            <span className="profile-user-name">Admin User</span>
                            <span className="profile-user-role">SUPER ADMINISTRATOR</span>
                        </div>
                        <div className="profile-avatar-circle">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Cards (Tự động nhận padding lề hai bên từ CSS mới) */}
            <section className="log-stats-grid">
                <article className="log-stat-card border-none">
                    <div className="log-stat-header">
                        <span className="badge-today">+12% so với hôm qua</span>
                    </div>
                    <div className="log-stat-body">
                        <p className="log-stat-label">TOTAL LOGINS TODAY</p>
                        <p className="log-stat-value">1,284</p>
                    </div>
                </article>

                <article className="log-stat-card border-none">
                    <div className="log-stat-header">
                        <span className="log-stat-icon-top group-icon">
                            <span className="material-symbols-outlined">groups</span>
                        </span>
                        <span className="badge-stable">Ổn định</span>
                    </div>
                    <div className="log-stat-body">
                        <p className="log-stat-label">ACTIVE SESSIONS</p>
                        <p className="log-stat-value">42</p>
                    </div>
                </article>

                <article className="log-stat-card border-none failed-card">
                    <div className="log-stat-header">
                        <span className="log-stat-icon-top alert-icon">
                            <span className="material-symbols-outlined">error</span>
                        </span>
                        <span className="badge-alert">Cảnh báo</span>
                    </div>
                    <div className="log-stat-body">
                        <p className="log-stat-label">FAILED ATTEMPTS</p>
                        <p className="log-stat-value text-red">15</p>
                    </div>
                </article>
            </section>

            {/* Filter Toolbar */}
            <section className="log-toolbar">
                <div className="log-filters">
                    <div className="log-filter-group search-group">
                        <label>Username / IP Address</label>
                        <div className="search-input-wrapper">
                            <span className="material-symbols-outlined">person</span>
                            <input
                                type="text"
                                placeholder="Nhập tên hoặc IP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            />
                        </div>
                    </div>

                    <div className="log-filter-group date-group">
                        <label>Khoảng thời gian</label>
                        <div className="date-input-wrapper">
                            <span className="material-symbols-outlined">calendar_today</span>
                            <input type="text" value="10/10/2023 - 11/10/2023" readOnly />
                        </div>
                    </div>

                    <div className="log-filter-group dropdown-group">
                        <label>Vai trò (Role)</label>
                        <select
                            className="log-select"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="Tất cả vai trò">Tất cả vai trò</option>
                            <option value="Admin">Admin</option>
                            <option value="Nhân viên">Nhân viên</option>
                        </select>
                    </div>

                    <button type="button" className="log-filter-button" onClick={handleFilter}>
                        <span className="material-symbols-outlined">filter_alt</span>
                        Filter
                    </button>
                </div>
            </section>

            {/* Table */}
            <section className="log-table-card">
                <table className="log-table">
                    <thead>
                        <tr>
                            <th>TIMESTAMP</th>
                            <th>USERNAME</th>
                            <th>IP ADDRESS</th>
                            <th>DEVICE/BROWSER</th>
                            <th>LOCATION</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map((log, index) => (
                                <tr key={index}>
                                    <td className="log-timestamp">{log.timestamp}</td>
                                    <td>
                                        <div className="log-user-cell">
                                            <div className={`user-avatar-circle initials-${log.initials}`}>
                                                {log.initials}
                                            </div>
                                            <span className="username-text">{log.username}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <a href={`#${log.ip}`} className="log-ip-link">{log.ip}</a>
                                    </td>
                                    <td>
                                        <div className="log-device-cell">
                                            <span className={`material-symbols-outlined device-icon ${log.status === 'Failed' ? 'text-red' : ''}`}>
                                                {log.deviceIcon}
                                            </span>
                                            <span>{log.device}</span>
                                        </div>
                                    </td>
                                    <td>{log.location}</td>
                                    <td>
                                        <span className={`status-badge-log ${log.status.toLowerCase()}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button type="button" className="log-action-btn">
                                            <span className="material-symbols-outlined">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                    Không có dữ liệu nhật ký phù hợp
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="log-table-footer">
                    <span className="footer-info">Đang hiển thị 1 - {logs.length} của 256 bản ghi</span>
                    <div className="log-pagination">
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button type="button" className="page-btn active">1</button>
                        <button type="button" className="page-btn">2</button>
                        <button type="button" className="page-btn">3</button>
                        <span className="pagination-dots">...</span>
                        <button type="button" className="page-btn">52</button>
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}