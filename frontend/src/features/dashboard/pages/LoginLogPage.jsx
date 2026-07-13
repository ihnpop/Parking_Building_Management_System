import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginLogs } from '../../../service/userApi';

export default function LoginLogPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('Tất cả vai trò');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [rawLogs, setRawLogs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

            let matchesDate = true;
            if (startDate || endDate) {
                const logDateStr = log.login_time || log.timestamp;
                if (logDateStr) {
                    const logDate = new Date(logDateStr);
                    if (!isNaN(logDate.getTime())) {
                        logDate.setHours(0, 0, 0, 0);

                        if (startDate) {
                            const sDate = new Date(startDate);
                            sDate.setHours(0, 0, 0, 0);
                            if (logDate < sDate) matchesDate = false;
                        }
                        if (endDate) {
                            const eDate = new Date(endDate);
                            eDate.setHours(23, 59, 59, 999);
                            if (logDate > eDate) matchesDate = false;
                        }
                    }
                }
            }

            return matchesSearch && matchesRole && matchesDate;
        });
        setLogs(filtered);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [search, roleFilter, startDate, endDate, rawLogs]);

    const getStatusClass = (status) => {
        if (status === 'Thành công') return 'success';
        if (status === 'Thất bại' || status === 'Tài khoản bị khóa') return 'failed';
        return status?.toLowerCase() || '';
    };

    const totalLogins = logs.length;
    const failedLogins = logs.filter(log => {
        const s = (log.status || '').toLowerCase();
        return s.includes('thất bại') || s.includes('khóa') || s === 'failed';
    }).length;
    const successLogins = logs.filter(log => {
        const s = (log.status || '').toLowerCase();
        return s.includes('thành công') || s === 'success';
    }).length;
    const activeSessions = successLogins;

    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = logs.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (start > 1) {
            if (start > 3) {
                pages.unshift('...');
                pages.unshift(2);
                pages.unshift(1);
            } else if (start === 3) {
                pages.unshift(2);
                pages.unshift(1);
            } else if (start === 2) {
                pages.unshift(1);
            }
        }

        if (end < totalPages) {
            if (end < totalPages - 2) {
                pages.push('...');
                pages.push(totalPages - 1);
                pages.push(totalPages);
            } else if (end === totalPages - 2) {
                pages.push(totalPages - 1);
                pages.push(totalPages);
            } else if (end === totalPages - 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

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
                            <span>Thất bại/Bị khóa</span>
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
                        <div className="filter-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', color: '#334155', fontFamily: 'inherit', fontSize: '13px', width: '45%' }}
                            />
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>đến</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', color: '#334155', fontFamily: 'inherit', fontSize: '13px', width: '45%' }}
                            />
                        </div>
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
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((log, index) => (
                                        <tr key={index}>
                                            <td className="log-timestamp">{log.timestamp}</td>
                                            <td>
                                                <div className="log-user-cell">
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
                                                    {log.status === 'Tài khoản bị khóa' ? 'Bị khóa' : log.status}
                                                </span>
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
                            <span className="footer-info">Đang hiển thị {Math.min(startIndex + 1, logs.length)} - {Math.min(startIndex + itemsPerPage, logs.length)} của {logs.length} bản ghi</span>
                            <div className="log-pagination">
                                <button
                                    type="button"
                                    className="page-btn"
                                    disabled={currentPage === 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>

                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`page-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                                        disabled={page === '...'}
                                        onClick={() => page !== '...' && handlePageChange(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    className="page-btn"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
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