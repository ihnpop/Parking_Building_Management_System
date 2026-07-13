import React, { useState, useEffect } from 'react';
import { getMonthCardLogs } from '../../../service/monthCardApi';

export default function MonthCardLogPage() {
    const [allLogs, setAllLogs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Tất cả');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await getMonthCardLogs();
            setAllLogs(data || []);
            setLogs(data || []);
            setError(null);
        } catch (err) {
            console.error("Error loading month card logs:", err);
            setError("Không thể tải nhật ký giao dịch vé tháng. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleFilter = () => {
        let filtered = allLogs.filter((log) => {
            const matchesSearch =
                (log.plate || '').toLowerCase().includes(search.toLowerCase()) ||
                (log.owner || '').toLowerCase().includes(search.toLowerCase());

            const matchesType = typeFilter === 'Tất cả' || log.type === typeFilter;
            const matchesStatus = statusFilter === 'Tất cả' || log.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
        setLogs(filtered);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [search, typeFilter, statusFilter, allLogs]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'Thành công': return 'success';
            case 'Đang xử lý': return 'pending';
            case 'Thất bại': return 'failed';
            default: return '';
        }
    };

    const totalTransactions = allLogs.length;
    const renewals = allLogs.filter(log => log.type === 'Gia hạn').length;
    const newRegistrations = allLogs.filter(log => log.type === 'Cấp mới').length;
    const reissues = allLogs.filter(log => log.type === 'Thẻ đã cấp lại').length;

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
            {/* Stats Grid */}
            <div className="lost-kpi-container">
                <div className="lost-kpi-grid">
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <span className="lost-kpi-title">Tổng giao dịch</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{loading ? '...' : totalTransactions}</div>
                            <div className="lost-kpi-footer txt-gray">Ghi nhận giao dịch</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-green">
                                <span className="material-symbols-outlined">add_card</span>
                            </div>
                            <span className="lost-kpi-title">Cấp mới</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-green">{loading ? '...' : newRegistrations}</div>
                            <div className="lost-kpi-footer txt-green">Thẻ đăng ký mới</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">autorenew</span>
                            </div>
                            <span className="lost-kpi-title">Gia hạn</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{loading ? '...' : renewals}</div>
                            <div className="lost-kpi-footer txt-blue">Gia hạn vé tháng</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-red">
                                <span className="material-symbols-outlined">credit_card</span>
                            </div>
                            <span className="lost-kpi-title">Thẻ đã cấp lại</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{loading ? '...' : reissues}</div>
                            <div className="lost-kpi-footer txt-red">Cấp lại thẻ</div>
                        </div>
                    </div>
                </div>

                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Phân phối giao dịch
                    </div>
                    <hr className="lost-dist-divider" />

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Mốc tổng giao dịch</span>
                            <span><span className="lost-dist-val">{totalTransactions}</span> <span className="lost-dist-pct">(100%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Cấp mới</span>
                            <span><span className="lost-dist-val">{newRegistrations}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((newRegistrations / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: `${totalTransactions > 0 ? (newRegistrations / totalTransactions) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Gia hạn</span>
                            <span><span className="lost-dist-val">{renewals}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((renewals / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-blue" style={{ width: `${totalTransactions > 0 ? (renewals / totalTransactions) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Thẻ đã cấp lại</span>
                            <span><span className="lost-dist-val">{reissues}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((reissues / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-red" style={{ width: `${totalTransactions > 0 ? (reissues / totalTransactions) * 100 : 0}%` }}></div>
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
                            placeholder="Biển số, Chủ xe..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">LOẠI GIAO DỊCH</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Gia hạn">Gia hạn</option>
                            <option value="Cấp mới">Cấp mới</option>
                            <option value="Thẻ đã cấp lại">Thẻ đã cấp lại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">TRẠNG THÁI</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Thành công">Thành công</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <section className="lost-table-card">
                {error && <div className="table-status-error">{error}</div>}

                {loading ? (
                    <div className="table-status-loading">Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <div className="mc-table-scroll">
                            <table className="mc-table">
                                <thead>
                                    <tr>
                                        <th>THỜI GIAN GIAO DỊCH</th>
                                        <th>BIỂN SỐ</th>
                                        <th>CHỦ XE</th>
                                        <th>LOẠI GD</th>
                                        <th>SỐ TIỀN THANH TOÁN</th>
                                        <th>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((log, index) => (
                                            <tr key={index} className="mc-table-row">
                                                <td className="log-time log-time-cell">{log.time}</td>
                                                <td className="mc-td-bold">{log.plate}</td>
                                                <td>{log.owner}</td>
                                                <td>{log.type}</td>
                                                <td className="log-amount log-amount-cell">{log.amount}</td>
                                                <td>
                                                    <span className={`status-badge-log ${getStatusClass(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="table-status-empty">
                                                Không tìm thấy nhật ký giao dịch phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="lost-table-footer">
                            <span className="footer-info">Hiển thị {Math.min(startIndex + 1, logs.length)} - {Math.min(startIndex + itemsPerPage, logs.length)} trong số {logs.length} giao dịch</span>
                            <div className="lost-pagination">
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