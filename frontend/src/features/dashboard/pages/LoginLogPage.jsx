import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialLogs = [
    { timestamp: '2023-11-24 14:32:01', username: 'nguyen.lam', initials: 'NL', role: 'Nhân viên', ip: '192.168.1.45', device: 'Chrome / macOS', deviceIcon: 'desktop_windows', location: 'Hà Nội, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:30:15', username: 'unknown_user', initials: 'UK', role: 'Nhân viên', ip: '45.12.8.212', device: 'Unknown / Bot', deviceIcon: 'public', location: 'Kyiv, UA', status: 'Failed' },
    { timestamp: '2023-11-24 14:28:44', username: 'tran.hoang', initials: 'TH', role: 'Nhân viên', ip: '115.23.45.98', device: 'Safari / iOS', deviceIcon: 'tablet_mac', location: 'TP.HCM, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:15:22', username: 'admin_main', initials: 'AD', role: 'Admin', ip: '10.0.0.5', device: 'Firefox / Windows', deviceIcon: 'laptop', location: 'Hà Nội, VN', status: 'Success' },
    { timestamp: '2023-11-24 14:10:05', username: 'le.van.an', initials: 'LV', role: 'Nhân viên', ip: '172.16.0.12', device: 'Edge / Windows', deviceIcon: 'desktop_windows', location: 'Đà Nẵng, VN', status: 'Success' },
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

            const matchesRole = roleFilter === 'Tất cả vai trò' || log.role === roleFilter;

            return matchesSearch && matchesRole;
        });
        setLogs(filtered);
    };


    const totalLogins = initialLogs.length;
    const successCount = initialLogs.filter(x => x.status === 'Success').length;
    const failedCount = initialLogs.filter(x => x.status === 'Failed').length;
    const adminCount = initialLogs.filter(x => x.role === 'Admin').length;
    const successPercent = totalLogins ? Math.round(successCount * 100 / totalLogins) : 0;
    const failedPercent = totalLogins ? Math.round(failedCount * 100 / totalLogins) : 0;
    const adminPercent = totalLogins ? Math.round(adminCount * 100 / totalLogins) : 0;

    return (
        <div className="lost-card-log-page" style={{ width: '100%' }}>

            {/* Bảng phân tích Dashboard KPIs đầu trang */}
            <section className="lost-dashboard-analytics-container">
                <div className="lost-stats-grid-layout" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>

                    <article className="lost-stat-box-item total-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon total-icon">
                                <span className="material-symbols-outlined font-icon-modern">insights</span>
                            </div>
                            <span className="lost-box-label">Tổng lượt truy cập</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-total">1,284</span>
                            <span className="lost-box-subtext success-alert">📈 +12% so với hôm qua</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item success-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon success-icon">
                                <span className="material-symbols-outlined font-icon-modern">groups</span>
                            </div>
                            <span className="lost-box-label">Phiên hoạt động</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-success">42</span>
                            <span className="lost-box-subtext success-alert">🟢 Ổn định</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item pending-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon pending-icon">
                                <span className="material-symbols-outlined font-icon-modern">error</span>
                            </div>
                            <span className="lost-box-label">Đăng nhập thất bại</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-pending">15</span>
                            <span className="lost-box-subtext warning-alert">⚠️ Cảnh báo rủi ro</span>
                        </div>
                    </article>

                </div>

                {/* Khối biểu đồ tỉ lệ 1/3 bên phải */}
                <div className="lost-chart-visualization-card compressed-width">
                    <div className="chart-header-zone">
                        <span className="material-symbols-outlined text-muted">insights</span>
                        <h4>Phân phối đăng nhập</h4>
                    </div>

                    <div className="chart-bars-wrapper">
                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Thành công</span>
                                <span className="bar-data-counter"><b>{successCount}</b> ({successPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color success-fill" style={{ width: `${successPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Thất bại</span>
                                <span className="bar-data-counter"><b>{failedCount}</b> ({failedPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color pending-warn-fill" style={{ width: `${failedPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Admin</span>
                                <span className="bar-data-counter"><b>{adminCount}</b> ({adminPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color processing-fill" style={{ width: `${adminPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Thanh công cụ bộ lọc */}
            <section className="lost-toolbar-modern">
                <div className="lost-filters-horizontal-bar">
                    <div className="lost-filter-item search-premium-wrapper">
                        <label className="filter-field-label">Username / IP Address</label>
                        <div className="premium-input-box-styled">
                            <span className="material-symbols-outlined search-brand-icon-premium">person</span>
                            <input
                                type="text"
                                placeholder="Nhập tên tài khoản, IP hoặc vị trí..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="button" className="lost-create-button-premium" onClick={handleFilter} style={{ height: '42px' }}>
                        <span className="material-symbols-outlined">filter_alt</span>
                        Lọc dữ liệu
                    </button>
                </div>
            </section>

            {/* Bảng danh sách log */}
            <section className="lost-table-card-premium">
                <div className="table-responsive-wrapper">
                    <table className="lost-table-modernized">
                        <thead>
                            <tr>
                                <th>TIMESTAMP</th>
                                <th>USERNAME</th>
                                <th>ROLE</th>
                                <th>IP ADDRESS</th>
                                <th>DEVICE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, index) => (
                                <tr key={index} className="row-animation-item">
                                    <td className="text-muted-smooth" style={{ fontFamily: 'monospace' }}>{log.timestamp}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '700', fontSize: '12px',
                                                background: log.initials === 'AD' ? '#eff6ff' : '#f1f5f9',
                                                color: log.initials === 'AD' ? '#2563eb' : '#475569'
                                            }}>
                                                {log.initials}
                                            </div>
                                            <span style={{ fontWeight: '700', color: '#1f2937' }}>{log.username}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge-lost-premium ${log.role === 'Admin' ? 'status-pending' : 'status-cancelled'}`} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                                            {log.role}
                                        </span>
                                    </td>
                                    <td><a href="#!" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>{log.ip}</a></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: log.status === 'Failed' ? '#ef4444' : '#64748b' }}>{log.deviceIcon}</span>
                                            <span style={{ fontSize: '13px', color: '#4b5563' }}>{log.device}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge-lost-premium ${log.status === 'Success' ? 'status-recovered' : 'status-pending-wait'}`}>
                                            {log.status === 'Success' ? 'Thành công' : 'Thất bại'}
                                        </span>
                                    </td>
                                    <td>
                                        <button type="button" className="lost-action-btn-premium">
                                            <span className="material-symbols-outlined">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}