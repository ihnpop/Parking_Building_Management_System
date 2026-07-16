import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginLogs } from '../../../service/userApi';

export default function LoginLogPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tất cả vai trò');
    const [rawLogs, setRawLogs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await getLoginLogs();
            setRawLogs(data || []);
            setLogs(data || []);
        } catch (err) {
            console.error("Lỗi lấy nhật ký đăng nhập:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const handleFilter = () => {
        let filtered = rawLogs.filter((log) => {
            const matchesSearch = (log.username || '').toLowerCase().includes(search.toLowerCase()) ||
                (log.ip || '').toLowerCase().includes(search.toLowerCase()) ||
                (log.location || '').toLowerCase().includes(search.toLowerCase());

            const matchesRole = roleFilter === 'Tất cả vai trò' || log.role === roleFilter;

            return matchesSearch && matchesRole;
        });
        setLogs(filtered);
    };

    useEffect(() => {
        handleFilter();
    }, [search, roleFilter, rawLogs]);

    const getStatusClass = (status) => {
        if (status === 'Thành công') return 'success';
        if (status === 'Thất bại' || status === 'Tài khoản bị khóa') return 'failed';
        return status?.toLowerCase() || '';
    };

    const totalLogins = logs.length;
    const failedLogins = logs.filter(log => log.status === 'Thất bại' || log.status === 'Tài khoản bị khóa').length;
    const successLogins = logs.filter(log => log.status === 'Thành công').length;
    const activeSessions = successLogins; // Giả lập số phiên hoạt động dựa trên số lần đăng nhập thành công gần đây

    return (
        <div className="lost-card-log-wrapper">
            {/* Stats Cards */}
            <div className="lost-kpi-container" style={{ marginBottom: "24px" }}>
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
                            <div className="lost-kpi-footer txt-gray">Ghi nhận</div>
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
                            <span className="lost-kpi-title">Thất bại / Khóa</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{failedLogins}</div>
                            <div className="lost-kpi-footer txt-red">Cảnh báo bảo mật</div>
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
            <div className="lost-filter-card">
                <div className="filter-block">
                    <label className="filter-label">TÌM KIẾM NÂNG CAO</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Nhập tên, IP hoặc vị trí..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
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
                            value="Toàn thời gian" 
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
                            <option value="Quản lý">Quản lý</option>
                            <option value="Nhân viên">Nhân viên</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <section className="log-table-card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                        Đang tải dữ liệu nhật ký đăng nhập...
                    </div>
                ) : (
                    <>
                        <table className="log-table">
                            <thead>
                                <tr>
                                    <th>THỜI GIAN</th>
                                    <th>HỌ TÊN</th>
                                    <th>VAI TRÒ</th>
                                    <th>ĐỊA CHỈ IP</th>
                                    <th>THIẾT BỊ/TRÌNH DUYỆT</th>
                                    <th>VỊ TRÍ</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length > 0 ? (
                                    logs.map((log, index) => (
                                        <tr key={index}>
                                            <td className="log-timestamp">{log.timestamp}</td>
                                            <td>
                                                <div className="log-user-cell">
                                                    <div className={`user-avatar-circle initials-${log.initials || 'UK'}`}>
                                                        {log.initials || 'UK'}
                                                    </div>
                                                    <span className="username-text">{log.username}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`role-badge ${log.role === 'Admin' ? 'admin' : log.role === 'Quản lý' ? 'manager' : 'staff'}`}>
                                                    {log.role}
                                                </span>
                                            </td>
                                            <td>
                                                <a href={`#${log.ip}`} className="log-ip-link">{log.ip}</a>
                                            </td>
                                            <td>
                                                <div className="log-device-cell">
                                                    <span className={`material-symbols-outlined device-icon ${log.status !== 'Thành công' ? 'text-red' : ''}`}>
                                                        {log.deviceIcon || 'public'}
                                                    </span>
                                                    <span>{log.device}</span>
                                                </div>
                                            </td>
                                            <td>{log.location}</td>
                                            <td>
                                                <span className={`status-badge-log ${getStatusClass(log.status)}`}>
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
                            <span className="footer-info">Đang hiển thị 1 - {logs.length} của {logs.length} bản ghi</span>
                            <div className="log-pagination">
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button type="button" className="page-btn active">1</button>
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
