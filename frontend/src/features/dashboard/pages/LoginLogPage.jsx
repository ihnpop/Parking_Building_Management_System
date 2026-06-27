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

    
    const totalLogins = logs.length;
    const failedLogins = logs.filter(log => log.status === 'Failed').length;
    const successLogins = logs.filter(log => log.status === 'Success').length;
    const activeSessions = 42; // Giả lập dữ liệu

    return (
        <div className="lost-card-log-wrapper">


            {/* Stats Cards */}
            
            <div className="lost-kpi-container" style={{marginBottom: "24px"}}>
                <div className="lost-kpi-grid">
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">login</span>
                            </div>
                            <span className="lost-kpi-title">Tổng đăng nhập</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{totalLogins}</div>
                            <div className="lost-kpi-footer txt-gray">Hôm nay</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-green">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className="lost-kpi-title">Thành công</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-green">{successLogins}</div>
                            <div className="lost-kpi-footer txt-green">Truy cập hợp lệ</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">groups</span>
                            </div>
                            <span className="lost-kpi-title">Phiên hoạt động</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{activeSessions}</div>
                            <div className="lost-kpi-footer txt-blue">Đang online</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-red">
                                <span className="material-symbols-outlined">error</span>
                            </div>
                            <span className="lost-kpi-title">Thất bại</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{failedLogins}</div>
                            <div className="lost-kpi-footer txt-red">Cảnh báo</div>
                        </div>
                    </div>
                </div>

                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Phân phối đăng nhập
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Mốc tổng đăng nhập</span>
                            <span><span className="lost-dist-val">{totalLogins}</span> <span className="lost-dist-pct">(100%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Thành công</span>
                            <span><span className="lost-dist-val">{successLogins}</span> <span className="lost-dist-pct">({totalLogins > 0 ? Math.round((successLogins / totalLogins) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: `${totalLogins > 0 ? (successLogins / totalLogins) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Phiên hoạt động</span>
                            <span><span className="lost-dist-val">{activeSessions}</span> <span className="lost-dist-pct">({totalLogins > 0 ? Math.round((activeSessions / totalLogins) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-blue" style={{ width: `${totalLogins > 0 ? (activeSessions / totalLogins) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Thất bại</span>
                            <span><span className="lost-dist-val">{failedLogins}</span> <span className="lost-dist-pct">({totalLogins > 0 ? Math.round((failedLogins / totalLogins) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-red" style={{ width: `${totalLogins > 0 ? (failedLogins / totalLogins) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Filter Toolbar */}
            
            {/* Filter Toolbar */}
            <div className="lost-filter-card">
                <div className="filter-block">
                    <label className="filter-label">TÌM KIẾM NÂNG CAO</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Nhập tên hoặc IP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                        />
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">KHOẢNG THỜI GIAN</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">calendar_today</span>
                        <input 
                            type="text" 
                            className="filter-input has-icon-left"
                            value="10/10/2023 - 11/10/2023" 
                            style={{ paddingLeft: '36px' }}
                            readOnly 
                        />
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">VAI TRÒ (ROLE)</label>
                    <div className="filter-input-wrapper">
                        <select 
                            className="filter-select"
                            value={roleFilter} 
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="Tất cả vai trò">Tất cả vai trò</option>
                            <option value="Admin">Admin</option>
                            <option value="Nhân viên">Nhân viên</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>
            </div>


            {/* Table */}
            <section className="log-table-card">
                <table className="log-table">
                    <thead>
                        <tr>
                            <th>TIMESTAMP</th>
                            <th>USERNAME</th>
                            <th>ROLE</th>
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
                                        <span className={`role-badge ${log.role === 'Admin' ? 'admin' : 'staff'}`}>
                                            {log.role}
                                        </span>
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
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
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

            {/* Bottom Section widgets */}
            {/* <section className="log-bottom-widgets">
                <article className="widget-card security-report">
                    <div className="widget-content">
                        <h3>Báo cáo bảo mật hàng tuần</h3>
                        <p>Tóm tắt các nỗ lực truy cập bất hợp pháp và phân tích rủi ro hệ thống.</p>
                    </div>
                    <button type="button" className="widget-action-btn">
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </article>

                <article className="widget-card system-status">
                    <div className="widget-content">
                        <h3>Tình trạng hệ thống</h3>
                        <p>Tất cả các dịch vụ xác thực đang hoạt động bình thường ở mức hiệu năng tối ưu.</p>
                    </div>
                    <div className="status-indicator-circle">
                        <span className="material-symbols-outlined">check</span>
                    </div>
                </article>
            </section> */}
        </div>
    );
}
