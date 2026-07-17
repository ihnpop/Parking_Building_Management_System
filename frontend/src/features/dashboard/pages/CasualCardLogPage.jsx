import React, { useState, useEffect } from 'react';
import {
    getCasualCardSessions,
    getCasualTotalRevenue,
    mapSessionToRow,
} from '../../../service/casualCardApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(num);
}

function getStatusClass(status) {
    switch (status) {
        case 'Hoàn thành': return 'success';
        case 'Đang gửi xe': return 'info';
        case 'Chờ thanh toán': return 'pending';
        case 'Mất thẻ': return 'failed';
        case 'Đã hủy': return 'failed';
        default: return '';
    }
}

// ─── Component chính ──────────────────────────────────────────────────────────
export default function CasualCardLogPage() {
    // ── State chính ──────────────────────────────────────────────────────────
    const [allRows, setAllRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // ── Pagination ───────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ── Filter state ─────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // ── VNPay Bill Modal ─────────────────────────────────────────────────────
    const [showBillModal, setShowBillModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    // ── Fetch data ───────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [sessions, revenue] = await Promise.all([
                getCasualCardSessions(),
                getCasualTotalRevenue(),
            ]);
            const rows = (sessions || []).map(mapSessionToRow);
            setAllRows(rows);
            setFilteredRows(rows);
            setTotalRevenue(revenue || 0);
        } catch (err) {
            console.error('[CasualCardLog] fetchData:', err);
            setError('Không thể tải nhật ký thẻ lượt. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ── Filter logic ─────────────────────────────────────────────────────────
    useEffect(() => {
        let result = allRows;

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(
                (r) =>
                    (r.plate || '').toLowerCase().includes(q) ||
                    (r.cardCode || '').toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'Tất cả') {
            result = result.filter((r) => r.status === statusFilter);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter((r) => r.entryTime && new Date(r.entryTime) >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((r) => r.entryTime && new Date(r.entryTime) <= to);
        }

        setFilteredRows(result);
        setCurrentPage(1);
    }, [search, statusFilter, dateFrom, dateTo, allRows]);

    // ── KPI tính từ allRows ──────────────────────────────────────────────────
    const totalSessions = allRows.length;
    const activeSessions = allRows.filter((r) => r.status === 'Đang gửi xe').length;
    const completedSessions = allRows.filter((r) => r.status === 'Hoàn thành').length;
    const otherSessions = totalSessions - activeSessions - completedSessions;

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredRows.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        for (let i = start; i <= end; i++) pages.push(i);
        if (start > 1) {
            if (start > 3) { pages.unshift('...'); pages.unshift(2); pages.unshift(1); }
            else if (start === 3) { pages.unshift(2); pages.unshift(1); }
            else if (start === 2) pages.unshift(1);
        }
        if (end < totalPages) {
            if (end < totalPages - 2) { pages.push('...'); pages.push(totalPages - 1); pages.push(totalPages); }
            else if (end === totalPages - 2) { pages.push(totalPages - 1); pages.push(totalPages); }
            else if (end === totalPages - 1) pages.push(totalPages);
        }
        return pages;
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="lost-card-log-wrapper">

            {/* ── KPI + Phân phối ────────────────────────────────────────────── */}
            <div className="lost-kpi-container">
                <div className="lost-kpi-grid">

                    {/* Tổng giao dịch */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">confirmation_number</span>
                            </div>
                            <span className="lost-kpi-title">Tổng phiên</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{loading ? '...' : totalSessions}</div>
                            <div className="lost-kpi-footer txt-gray">Lượt xe vãng lai</div>
                        </div>
                    </div>

                    {/* Đang gửi xe */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">directions_car</span>
                            </div>
                            <span className="lost-kpi-title">Đang gửi xe</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{loading ? '...' : activeSessions}</div>
                            <div className="lost-kpi-footer txt-blue">Xe trong bãi</div>
                        </div>
                    </div>

                    {/* Đã ra */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-green">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className="lost-kpi-title">Đã hoàn thành</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-green">{loading ? '...' : completedSessions}</div>
                            <div className="lost-kpi-footer txt-green">Xe đã ra thành công</div>
                        </div>
                    </div>

                    {/* Tổng doanh thu */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-orange">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <span className="lost-kpi-title">Tổng doanh thu</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-orange" style={{ fontSize: '1.1rem' }}>
                                {loading ? '...' : formatVND(totalRevenue)}
                            </div>
                            <div className="lost-kpi-footer txt-orange">Vé lượt đã thanh toán</div>
                        </div>
                    </div>

                </div>

                {/* Phân phối */}
                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Phân phối trạng thái
                    </div>
                    <hr className="lost-dist-divider" />

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Tổng phiên</span>
                            <span>
                                <span className="lost-dist-val">{totalSessions}</span>{' '}
                                <span className="lost-dist-pct">(100%)</span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đang gửi xe</span>
                            <span>
                                <span className="lost-dist-val">{activeSessions}</span>{' '}
                                <span className="lost-dist-pct">
                                    ({totalSessions > 0 ? Math.round((activeSessions / totalSessions) * 100) : 0}%)
                                </span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div
                                className="lost-dist-fill bg-blue"
                                style={{ width: `${totalSessions > 0 ? (activeSessions / totalSessions) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Hoàn thành</span>
                            <span>
                                <span className="lost-dist-val">{completedSessions}</span>{' '}
                                <span className="lost-dist-pct">
                                    ({totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%)
                                </span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div
                                className="lost-dist-fill bg-green"
                                style={{ width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Khác (hủy / mất thẻ)</span>
                            <span>
                                <span className="lost-dist-val">{otherSessions}</span>{' '}
                                <span className="lost-dist-pct">
                                    ({totalSessions > 0 ? Math.round((otherSessions / totalSessions) * 100) : 0}%)
                                </span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div
                                className="lost-dist-fill bg-red"
                                style={{ width: `${totalSessions > 0 ? (otherSessions / totalSessions) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
            <div className="lost-filter-card">

                {/* Tìm kiếm */}
                <div className="filter-block">
                    <label className="filter-label">TÌM KIẾM</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Biển số, Mã thẻ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Lọc trạng thái */}
                <div className="filter-block">
                    <label className="filter-label">TRẠNG THÁI</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Đang gửi xe">Đang gửi xe</option>
                            <option value="Chờ thanh toán">Chờ thanh toán</option>
                            <option value="Hoàn thành">Hoàn thành</option>
                            <option value="Mất thẻ">Mất thẻ</option>
                            <option value="Đã hủy">Đã hủy</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                {/* Khoảng ngày */}
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
                {(search || statusFilter !== 'Tất cả' || dateFrom || dateTo) && (
                    <div className="filter-block reset-filter-btn-container" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            type="button"
                            className="icon-reset-btn"
                            title="Xóa lọc"
                            onClick={() => {
                                setSearch('');
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

            {/* ── Table ──────────────────────────────────────────────────────── */}
            <section className="lost-table-card">
                {error && (
                    <div className="table-status-error">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="table-status-loading">Đang tải nhật ký thẻ lượt...</div>
                ) : (
                    <>
                        <div style={{ width: '100%', overflow: 'hidden' }}>
                            <table className="mc-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '7%' }} />
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '6%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>MÃ THẺ</th>
                                        <th>BIỂN SỐ</th>
                                        <th>LOẠI XE</th>
                                        <th>GIỜ VÀO</th>
                                        <th>GIỜ RA</th>
                                        <th>THỜI GIAN</th>
                                        <th style={{ textAlign: 'right' }}>PHÍ</th>
                                        <th>THANH TOÁN</th>
                                        <th>TRẠNG THÁI</th>
                                        <th>NHÂN VIÊN</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>BILL</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((row, idx) => (
                                            <tr key={row.session_id || idx} className="mc-table-row">
                                                <td className="mc-td-bold" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                                    {row.cardCode}
                                                </td>
                                                <td className="mc-td-bold">{row.plate}</td>
                                                <td>{row.vehicleType}</td>
                                                <td className="log-time log-time-cell">
                                                    {row.entryTimeSplit ? (
                                                        <>
                                                            <div style={{ color: '#4b5563' }}>{row.entryTimeSplit.date}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.entryTimeSplit.time}</div>
                                                        </>
                                                    ) : '---'}
                                                </td>
                                                <td className="log-time log-time-cell">
                                                    {row.exitTimeSplit ? (
                                                        <>
                                                            <div style={{ color: '#4b5563' }}>{row.exitTimeSplit.date}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.exitTimeSplit.time}</div>
                                                        </>
                                                    ) : '---'}
                                                </td>
                                                <td style={{ fontSize: '13px', color: '#4b5563' }}>{row.duration}</td>
                                                <td className="log-amount log-amount-cell" style={{ textAlign: 'right' }}>{row.feeDisplay}</td>
                                                <td style={{ fontSize: '13px' }}>
                                                    {row.paymentMethod}
                                                </td>
                                                <td>
                                                    <span className={`status-badge-log ${getStatusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px' }}>{row.staffIn}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                                        {row.paymentMethod?.toLowerCase() === 'vnpay' && row.paymentInfo && (
                                                            <button
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                                title="Xem bill VNPay"
                                                                onClick={() => {
                                                                    setSelectedBill(row.paymentInfo);
                                                                    setShowBillModal(true);
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>visibility</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="11" className="table-status-empty">
                                                {search || statusFilter !== 'Tất cả' || dateFrom || dateTo
                                                    ? 'Không tìm thấy phiên gửi xe phù hợp với điều kiện lọc'
                                                    : 'Chưa có dữ liệu nhật ký thẻ lượt'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer pagination */}
                        <div className="lost-table-footer">
                            <span className="footer-info">
                                Hiển thị{' '}
                                {filteredRows.length > 0
                                    ? `${Math.min(startIndex + 1, filteredRows.length)} - ${Math.min(startIndex + itemsPerPage, filteredRows.length)}`
                                    : '0'}{' '}
                                trong số {filteredRows.length} phiên
                                {allRows.length !== filteredRows.length && (
                                    <span style={{ color: '#6b7280', marginLeft: 4 }}>
                                        (tổng {allRows.length})
                                    </span>
                                )}
                            </span>

                            {totalPages > 1 && (
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
                            )}
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
                                <span>{selectedBill.transaction_no || selectedBill.order_code || '---'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Số tiền:</span>
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedBill.amount || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Thời gian thanh toán:</span>
                                <span>{selectedBill.paid_at ? new Date(selectedBill.paid_at).toLocaleString('vi-VN') : '---'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '600', color: '#475569' }}>Trạng thái:</span>
                                <span style={{ color: selectedBill.status === 'Đã thanh toán' ? '#10b981' : '#f59e0b', fontWeight: '600' }}>{selectedBill.status || '---'}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowBillModal(false)}
                                style={{ padding: '8px 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
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
