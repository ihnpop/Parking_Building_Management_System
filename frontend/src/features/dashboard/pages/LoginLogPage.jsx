import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginLogs } from '../../../service/userApi';

function filterRowsByTime(rows, mode, dateStr) {
    if (!dateStr) return rows;
    return rows.filter((r) => {
        const t = r.login_time || r.timestamp || r.time || r.created_at || r.date;
        if (!t) return false;

        let entry;
        const strT = String(t).trim();
        if (strT.includes('/')) {
            const datePart = strT.split(' ').find(p => p.includes('/')) || strT;
            const parts = datePart.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    entry = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
                } else {
                    entry = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                }
            } else {
                entry = new Date(t);
            }
        } else {
            entry = new Date(t);
        }

        if (isNaN(entry.getTime())) return false;
        const entryDateVN = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(entry);
        if (mode === 'day') {
            return entryDateVN === dateStr;
        }
        return entryDateVN.slice(0, 7) === dateStr;
    });
}

export default function LoginLogPage({ kpiTimeFilter, kpiDate, kpiMonth }) {
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

    const kpiFilteredLogs = useMemo(() => {
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        return filterRowsByTime(rawLogs, kpiTimeFilter, dateStr);
    }, [rawLogs, kpiTimeFilter, kpiDate, kpiMonth]);

    const totalLogins = kpiFilteredLogs.length;
    const failedLogins = kpiFilteredLogs.filter(log => {
        const s = (log.status || '').toLowerCase();
        return s.includes('thất bại') || s.includes('khóa') || s === 'failed';
    }).length;
    const successLogins = kpiFilteredLogs.filter(log => {
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
        if (totalPages <= 3) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage === 1) {
                pages.push(1, 2, 3);
            } else if (currentPage === totalPages) {
                pages.push(totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(currentPage - 1, currentPage, currentPage + 1);
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
                    <label className="filter-label">VAI TRÒ</label>
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

                <div className="filter-block">
                    <label className="filter-label">KHOẢNG THỜI GIAN</label>
                    <div className="filter-input-wrapper">
                        <div className="filter-input date-range-wrapper">
                            <input
                                type="date"
                                className="date-range-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="date-range-sep">đến</span>
                            <input
                                type="date"
                                className="date-range-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Nút reset filter */}
                {(search || startDate || endDate || roleFilter !== 'Tất cả vai trò') && (
                    <div className="filter-block reset-filter-btn-container" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            type="button"
                            className="icon-reset-btn"
                            title="Xóa lọc"
                            onClick={() => {
                                setSearch('');
                                setStartDate('');
                                setEndDate('');
                                setRoleFilter('Tất cả vai trò');
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_alt_off</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <section className="log-table-card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                        Đang tải dữ liệu nhật ký đăng nhập...
                    </div>
                ) : (
                    <>
                        {/* Bọc bảng trong container cuộn ngang tự động và thiết lập minWidth để tránh vỡ giao diện khi thu nhỏ màn hình */}
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="log-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '850px' }}>
                                <colgroup>
                                    <col style={{ width: '15%' }} /> {/* THỜI GIAN */}
                                    <col style={{ width: '25%' }} /> {/* HỌ TÊN */}
                                    <col style={{ width: '15%' }} /> {/* VAI TRÒ */}
                                    <col style={{ width: '30%' }} /> {/* THIẾT BỊ/TRÌNH DUYỆT */}
                                    <col style={{ width: '15%' }} /> {/* TRẠNG THÁI */}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ whiteSpace: 'nowrap' }}>THỜI GIAN</th>
                                        <th style={{ whiteSpace: 'nowrap' }}>HỌ TÊN</th>
                                        <th style={{ whiteSpace: 'nowrap' }}>VAI TRÒ</th>
                                        <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>THIẾT BỊ/TRÌNH DUYỆT</th>
                                        <th style={{ whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((log, index) => (
                                            <tr key={index}>
                                                <td className="log-timestamp" style={{ whiteSpace: 'nowrap' }}>
                                                    {log.timestamp ? (
                                                        log.timestamp.includes(' ') ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontWeight: '500' }}>{log.timestamp.split(' ')[1]}</span>
                                                                <span style={{ fontSize: '0.9em', color: '#666' }}>{log.timestamp.split(' ')[0]}</span>
                                                            </div>
                                                        ) : log.timestamp
                                                    ) : ''}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div className="log-user-cell" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <span className="username-text">{log.username}</span>
                                                    </div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <span className={`role-badge ${log.role === 'Admin' ? 'admin' : log.role === 'Quản lý' ? 'manager' : 'staff'}`} style={{ minWidth: '80px', display: 'inline-block', textAlign: 'center' }}>
                                                        {log.role}
                                                    </span>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div className="log-device-cell" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                                        <span className={`material-symbols-outlined device-icon ${log.status !== 'Thành công' ? 'text-red' : ''}`} style={{ flexShrink: 0 }}>
                                                            {log.deviceIcon || 'public'}
                                                        </span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.device}</span>
                                                    </div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <span className={`status-badge-log ${getStatusClass(log.status)}`} style={{ minWidth: '90px', display: 'inline-block', textAlign: 'center' }}>
                                                        {log.status === 'Tài khoản bị khóa' ? 'Bị khóa' : log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="table-status-empty">
                                                Không có dữ liệu nhật ký phù hợp
                                            </td>
                                            <td>
                                                <button type="button" className="log-action-btn">
                                                    <span className="material-symbols-outlined">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="log-table-footer">
                            <span className="footer-info">Đang hiển thị {logs.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, logs.length)} của {logs.length} bản ghi</span>
                            <div className="log-pagination">
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>

                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`page-btn ${page === currentPage ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
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
