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
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [showBillModal, setShowBillModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

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

            let matchesDate = true;
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                const logDate = new Date(log.timestamp || log.created_at);
                if (logDate < from) matchesDate = false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                const logDate = new Date(log.timestamp || log.created_at);
                if (logDate > to) matchesDate = false;
            }

            return matchesSearch && matchesType && matchesStatus && matchesDate;
        });
        setLogs(filtered);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [search, typeFilter, statusFilter, dateFrom, dateTo, allLogs]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'Hoàn thành': return 'success';
            case 'Chờ thanh toán': return 'pending';
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
                            <option value="Hoàn thành">Hoàn thành</option>
                            <option value="Chờ thanh toán">Chờ thanh toán</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">KHOẢNG NGÀY</label>
                    <div className="filter-input-wrapper">
                        <div className="filter-input date-range-wrapper">
                            <input
                                type="date"
                                className="date-range-input"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <span className="date-range-sep">đến</span>
                            <input
                                type="date"
                                className="date-range-input"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Nút reset filter */}
                {(search || typeFilter !== 'Tất cả' || statusFilter !== 'Tất cả' || dateFrom || dateTo) && (
                    <div className="filter-block reset-filter-btn-container" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            type="button"
                            className="icon-reset-btn"
                            title="Xóa lọc"
                            onClick={() => {
                                setSearch('');
                                setTypeFilter('Tất cả');
                                setStatusFilter('Tất cả');
                                setDateFrom('');
                                setDateTo('');
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_alt_off</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <section className="lost-table-card">
                {error && <div className="table-status-error">{error}</div>}

                {loading ? (
                    <div className="table-status-loading">Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <div style={{ width: '100%', overflow: 'hidden' }}>
                            <table className="mc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '17%' }} /> {/* THỜI GIAN GIAO DỊCH */}
                                    <col style={{ width: '12%' }} /> {/* BIỂN SỐ */}
                                    <col style={{ width: '15%' }} /> {/* CHỦ XE */}
                                    <col style={{ width: '13%' }} /> {/* LOẠI GIAO DỊCH */}
                                    <col style={{ width: '12%' }} /> {/* PHÍ */}
                                    <col style={{ width: '12%' }} /> {/* THANH TOÁN */}
                                    <col style={{ width: '13%' }} /> {/* TRẠNG THÁI */}
                                    <col style={{ width: '6%' }} />  {/* BILL */}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>THỜI GIAN GIAO DỊCH</th>
                                        <th>BIỂN SỐ</th>
                                        <th>CHỦ XE</th>
                                        <th>LOẠI GIAO DỊCH</th>
                                        <th style={{ textAlign: 'right' }}>PHÍ</th>
                                        <th>THANH TOÁN</th>
                                        <th>TRẠNG THÁI</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>BILL</div>
                                        </th>
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
                                                <td className="log-amount log-amount-cell" style={{ textAlign: 'right' }}>{log.amount}</td>
                                                <td>
                                                    <span className={`method-badge ${log.paymentMethod?.toLowerCase() === 'vnpay' ? 'method-vnpay' : 'method-cash'}`}>
                                                        {log.paymentMethod || 'Tiền mặt'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge-log ${getStatusClass(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '20px' }}>
                                                        {log.paymentMethod?.toLowerCase() === 'vnpay' ? (
                                                            <button
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Xem bill VNPay"
                                                                onClick={() => {
                                                                    setSelectedBill(log);
                                                                    setShowBillModal(true);
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>visibility</span>
                                                            </button>
                                                        ) : (
                                                            <span style={{ display: 'inline-block', width: '20px', height: '20px' }}></span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="table-status-empty">
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

            {/* VNPay Bill Modal */}
            {showBillModal && selectedBill && (
                <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '400px', maxWidth: '90%', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Hóa đơn VNPay</h3>
                            <button onClick={() => setShowBillModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Mã giao dịch:</span>
                                <span>{selectedBill.paymentInfo?.transaction_no || selectedBill.paymentInfo?.order_code || '---'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Số tiền:</span>
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>{selectedBill.amount || '0 đ'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Thời gian thanh toán:</span>
                                <span>{selectedBill.paymentInfo?.paid_at ? new Date(selectedBill.paymentInfo.paid_at).toLocaleString('vi-VN') : '---'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Trạng thái:</span>
                                <span style={{ color: selectedBill.status === 'Hoàn thành' ? '#10b981' : '#f59e0b', fontWeight: '600' }}>{selectedBill.status || '---'}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowBillModal(false)}
                                style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 24px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}