import React, { useState, useEffect, useMemo } from 'react';
import {
    getCasualCardSessions,
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
        case 'Đã xong':
        case 'Hoàn thành': return 'success';
        case 'Đang gửi xe': return 'info';
        case 'Chờ thanh toán': return 'pending';
        case 'Mất thẻ': return 'failed';
        case 'Thẻ đã cấp lại': return 'failed';
        case 'Thất bại': return 'failed';
        default: return '';
    }
}

/** Trả về chuỗi yyyy-MM-dd theo timezone Việt Nam */
function todayVN() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

/** Trả về chuỗi yyyy-MM theo timezone Việt Nam */
function thisMonthVN() {
    const d = todayVN(); // yyyy-MM-dd
    return d.slice(0, 7); // yyyy-MM
}

/**
 * Lọc danh sách rows theo entry_time nằm trong khoảng thời gian.
 * @param {'day'|'month'} mode
 * @param {string} dateStr  yyyy-MM-dd (mode=day) hoặc yyyy-MM (mode=month)
 */
function filterRowsByTime(rows, mode, dateStr) {
    if (!dateStr) return rows;
    return rows.filter((r) => {
        if (!r.entryTime) return false;
        const entry = new Date(r.entryTime);
        if (isNaN(entry.getTime())) return false;
        // Chuyển sang ngày VN
        const entryDateVN = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(entry);
        if (mode === 'day') {
            return entryDateVN === dateStr;
        }
        // mode === 'month'
        return entryDateVN.slice(0, 7) === dateStr;
    });
}

const renderFormattedTime = (dateInput) => {
    if (!dateInput) return <span style={{ color: '#ccc' }}>---</span>;

    if (typeof dateInput === 'string' && dateInput.includes('/')) {
        const parts = dateInput.trim().split(/\s+/);
        if (parts.length >= 2) {
            const timePart = parts[0];
            let datePart = parts[1];
            const datePieces = datePart.split('/');
            if (datePieces.length === 3) {
                const day = datePieces[0].length === 4 ? datePieces[2] : datePieces[0];
                const month = datePieces[1];
                const year = datePieces[0].length === 4 ? datePieces[0] : datePieces[2];
                datePart = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
                return (
                    <div className="log-time-column">
                        <span className="log-time-clock">{timePart}</span>
                        <span className="log-time-date">{datePart}</span>
                    </div>
                );
            }
        }
    }

    let d = null;
    if (typeof dateInput === 'string') {
        let strT = dateInput.trim();
        if (strT.includes(' ') && !strT.includes('T')) {
            strT = strT.replace(' ', 'T');
        }
        const hasTimezone = strT.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(strT);
        if (!hasTimezone) {
            strT = strT + 'Z';
        }
        const parsed = new Date(strT);
        if (!isNaN(parsed.getTime())) {
            d = parsed;
        } else {
            const parsedNormal = new Date(dateInput);
            if (!isNaN(parsedNormal.getTime())) d = parsedNormal;
        }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        d = dateInput;
    }

    if (d) {
        const timePart = new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        const datePart = new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d);
        return (
            <div className="log-time-column">
                <span className="log-time-clock">{timePart}</span>
                <span className="log-time-date">{datePart}</span>
            </div>
        );
    }

    return <span className="log-time-clock">{String(dateInput)}</span>;
};

// ─── Component chính ──────────────────────────────────────────────────────────
export default function CasualCardLogPage({ kpiTimeFilter = 'day', kpiDate: kpiDateProp, kpiMonth: kpiMonthProp }) {
    // Fallback defaults nếu không nhận props
    const kpiDate = kpiDateProp || todayVN();
    const kpiMonth = kpiMonthProp || thisMonthVN();
    // ── State chính ──────────────────────────────────────────────────────────
    const [allRows, setAllRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Pagination ───────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ── Filter state (bảng dữ liệu) ─────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');



    // ── VNPay Bill Modal ─────────────────────────────────────────────────────
    const [showBillModal, setShowBillModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    // ── Fetch data ───────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const sessions = await getCasualCardSessions();
            const rows = (sessions || []).map(mapSessionToRow);
            setAllRows(rows);
            setFilteredRows(rows);
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

    // ── Filter logic (bảng dữ liệu bên dưới) ────────────────────────────────
    useEffect(() => {
        // Áp dụng bộ lọc thời gian từ top-level KPI time filter
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        let result = filterRowsByTime(allRows, kpiTimeFilter, dateStr);

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

        setFilteredRows(result);
        setCurrentPage(1);
    }, [search, statusFilter, allRows, kpiTimeFilter, kpiDate, kpiMonth]);

    // ── KPI rows (lọc theo bộ lọc thời gian KPI) ────────────────────────────
    const kpiFilteredRows = useMemo(() => {
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        return filterRowsByTime(allRows, kpiTimeFilter, dateStr);
    }, [allRows, kpiTimeFilter, kpiDate, kpiMonth]);

    // ── KPI values ───────────────────────────────────────────────────────────
    // Ô 1: Tổng phiên (theo bộ lọc thời gian)
    const kpiTotalSessions = kpiFilteredRows.length;
    // Ô 2: Đang gửi xe (REAL-TIME – tất cả, không lọc)
    const kpiActiveSessions = allRows.filter((r) => r.status === 'Đang gửi xe').length;
    // Ô 3: Thất bại (theo bộ lọc thời gian)
    const kpiFailedSessions = kpiFilteredRows.filter((r) => r.status === 'Thất bại').length;
    // Ô 4: Tổng doanh thu (tính từ các phiên Hoàn thành/Đã xong trong khoảng thời gian)
    const kpiRevenue = kpiFilteredRows
        .filter((r) => r.status === 'Hoàn thành' || r.status === 'Đã xong')
        .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);

    // ── Phân phối trạng thái (5 statuses, dùng kpiFilteredRows) ──────────────
    const distTotal = kpiFilteredRows.length;
    const distCompleted = kpiFilteredRows.filter((r) => r.status === 'Hoàn thành' || r.status === 'Đã xong').length;
    const distActive = kpiFilteredRows.filter((r) => r.status === 'Đang gửi xe').length;
    const distPending = kpiFilteredRows.filter((r) => r.status === 'Chờ thanh toán').length;
    const distReissued = kpiFilteredRows.filter((r) => r.status === 'Thẻ đã cấp lại').length;
    const distFailed = kpiFilteredRows.filter((r) => r.status === 'Thất bại').length;

    const pct = (count) => distTotal > 0 ? Math.round((count / distTotal) * 100) : 0;
    const pctWidth = (count) => distTotal > 0 ? `${(count / distTotal) * 100}%` : '0%';

    // ── Pagination ───────────────────────────────────────────────────────────
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredRows.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="lost-card-log-wrapper">



            {/* ── KPI + Phân phối ────────────────────────────────────────────── */}
            <div className="lost-kpi-container">
                <div className="lost-kpi-grid">

                    {/* Ô 1: Tổng phiên */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">confirmation_number</span>
                            </div>
                            <span className="lost-kpi-title">Tổng phiên</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{loading ? '...' : kpiTotalSessions}</div>
                            <div className="lost-kpi-footer txt-gray">Lượt xe vãng lai</div>
                        </div>
                    </div>

                    {/* Ô 2: Đang gửi xe (REAL-TIME) */}
                    <div className="lost-kpi-card">
                        <span className="kpi-realtime-badge">
                            <span className="kpi-realtime-dot" />
                            Real-time
                        </span>
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">directions_car</span>
                            </div>
                            <span className="lost-kpi-title">Đang gửi xe</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{loading ? '...' : kpiActiveSessions}</div>
                            <div className="lost-kpi-footer txt-blue">Xe trong bãi</div>
                        </div>
                    </div>

                    {/* Ô 3: Thất bại */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-red-soft">
                                <span className="material-symbols-outlined">error</span>
                            </div>
                            <span className="lost-kpi-title">Thất bại</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{loading ? '...' : kpiFailedSessions}</div>
                            <div className="lost-kpi-footer txt-red">Phiên lỗi / sự cố</div>
                        </div>
                    </div>

                    {/* Ô 4: Tổng doanh thu */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-orange">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <span className="lost-kpi-title">Tổng doanh thu</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-orange" style={{ fontSize: '1.1rem' }}>
                                {loading ? '...' : formatVND(kpiRevenue)}
                            </div>
                            <div className="lost-kpi-footer txt-orange">Vé lượt đã thanh toán</div>
                        </div>
                    </div>

                </div>

                {/* Phân phối trạng thái (5 trạng thái) */}
                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Phân phối trạng thái
                    </div>
                    <hr className="lost-dist-divider" />

                    {/* Đã xong */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đã xong</span>
                            <span>
                                <span className="lost-dist-val">{distCompleted}</span>{' '}
                                <span className="lost-dist-pct">({pct(distCompleted)}%)</span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: pctWidth(distCompleted) }} />
                        </div>
                    </div>

                    {/* Đang gửi xe */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đang gửi xe</span>
                            <span>
                                <span className="lost-dist-val">{distActive}</span>{' '}
                                <span className="lost-dist-pct">({pct(distActive)}%)</span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-blue" style={{ width: pctWidth(distActive) }} />
                        </div>
                    </div>

                    {/* Chờ thanh toán */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Chờ thanh toán</span>
                            <span>
                                <span className="lost-dist-val">{distPending}</span>{' '}
                                <span className="lost-dist-pct">({pct(distPending)}%)</span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-yellow" style={{ width: pctWidth(distPending) }} />
                        </div>
                    </div>



                    {/* Thất bại */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Thất bại</span>
                            <span>
                                <span className="lost-dist-val">{distFailed}</span>{' '}
                                <span className="lost-dist-pct">({pct(distFailed)}%)</span>
                            </span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-red" style={{ width: pctWidth(distFailed) }} />
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
                            <option value="Đã xong">Đã xong</option>
                            <option value="Hoàn thành">Hoàn thành</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                {/* Nút reset filter */}
                {(search || statusFilter !== 'Tất cả') && (
                    <div className="filter-block reset-filter-btn-container" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            type="button"
                            className="icon-reset-btn"
                            title="Xóa lọc"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('Tất cả');
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
                        {/* Bọc bảng trong container cuộn ngang tự động và thiết lập minWidth để tránh dính/vỡ chữ khi thu nhỏ màn hình */}
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="mc-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '950px' }}>
                                <colgroup>
                                    <col style={{ width: '9%' }} />  {/* MÃ THẺ */}
                                    <col style={{ width: '10%' }} /> {/* BIỂN SỐ */}
                                    <col style={{ width: '8%' }} />  {/* LOẠI XE */}
                                    <col style={{ width: '10%' }} /> {/* GIỜ VÀO */}
                                    <col style={{ width: '10%' }} /> {/* GIỜ RA */}
                                    <col style={{ width: '5%' }} />  {/* THỜI GIAN */}
                                    <col style={{ width: '12%' }} /> {/* PHÍ */}
                                    <col style={{ width: '14%' }} /> {/* TRẠNG THÁI */}
                                    <col style={{ width: '12%' }} /> {/* NHÂN VIÊN */}
                                    <col style={{ width: '8%' }} />  {/* HÓA ĐƠN */}
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
                                        <th>TRẠNG THÁI</th>
                                        <th>NHÂN VIÊN</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', whiteSpace: 'nowrap' }}>HÓA ĐƠN</div>
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
                                                <td style={{ textAlign: 'left' }}>
                                                    {renderFormattedTime(row.entryTime || (row.entryTimeSplit ? `${row.entryTimeSplit.time} ${row.entryTimeSplit.date}` : null))}
                                                </td>
                                                <td style={{ textAlign: 'left' }}>
                                                    {renderFormattedTime(row.exitTime || (row.exitTimeSplit ? `${row.exitTimeSplit.time} ${row.exitTimeSplit.date}` : null))}
                                                </td>
                                                <td style={{ fontSize: '13px', color: '#4b5563' }}>{row.duration}</td>
                                                <td className="log-amount log-amount-cell" style={{ textAlign: 'right' }}>{row.feeDisplay}</td>
                                                <td>
                                                    <span className={`status-badge-log ${getStatusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px' }}>{row.staffIn}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                                        {(row.status === 'Hoàn thành' || row.paymentInfo || row.exitTime) && (
                                                            <button
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Xem thông tin giao dịch"
                                                                onClick={() => {
                                                                    setSelectedBill(row);
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
                                            <td colSpan="10" className="table-status-empty">
                                                {search || statusFilter !== 'Tất cả'
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
                            )}
                        </div>
                    </>
                )}
            </section>

            {/* Transaction Detail Modal */}
            {showBillModal && selectedBill && (
                <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '420px', maxWidth: '92%', padding: '0', boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                        {/* Header with status icon */}
                        <div style={{ background: selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã thanh toán' ? 'linear-gradient(135deg, #10b981, #059669)' : selectedBill.status === 'Thất bại' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '28px 24px 20px', textAlign: 'center', position: 'relative' }}>
                            <button
                                onClick={() => setShowBillModal(false)}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                            </button>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#fff' }}>
                                    {selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã thanh toán' ? 'check_circle' : selectedBill.status === 'Thất bại' ? 'cancel' : 'schedule'}
                                </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: '600' }}>Thông tin giao dịch</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                                {selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã thanh toán' ? 'Giao dịch thành công' : selectedBill.status === 'Thất bại' ? 'Giao dịch thất bại' : 'Giao dịch đang xử lý'}
                            </p>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {/* Mã giao dịch */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Mã giao dịch</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedBill.paymentInfo?.order_code || selectedBill.orderCode || selectedBill.paymentInfo?.transaction_no || selectedBill.session_id || ''}>
                                        {selectedBill.paymentInfo?.order_code || selectedBill.orderCode || selectedBill.paymentInfo?.transaction_no || selectedBill.session_id || '---'}
                                    </span>
                                </div>
                                {/* Loại giao dịch */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Loại giao dịch</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Gửi xe lượt</span>
                                </div>
                                {/* Số tiền */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Số tiền</span>
                                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>
                                        {selectedBill.feeDisplay || formatVND(selectedBill.fee) || (selectedBill.paymentInfo?.amount ? formatVND(selectedBill.paymentInfo.amount) : '---')}
                                    </span>
                                </div>
                                {/* Phương thức thanh toán */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Phương thức</span>
                                    <span className={`method-badge ${(selectedBill.paymentMethod || selectedBill.paymentInfo?.payment_method || '').toLowerCase() === 'vnpay' ? 'method-vnpay' : 'method-cash'}`} style={{ fontSize: '12px' }}>
                                        {selectedBill.paymentMethod || selectedBill.paymentInfo?.payment_method || 'Tiền mặt'}
                                    </span>
                                </div>
                                {/* Thời gian */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Thời gian</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                                        {selectedBill.exitTimeDisplay
                                            ? selectedBill.exitTimeDisplay
                                            : selectedBill.entryTimeDisplay
                                                ? selectedBill.entryTimeDisplay
                                                : selectedBill.paymentInfo?.paid_at
                                                    ? new Date(selectedBill.paymentInfo.paid_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                                                    : '---'}
                                    </span>
                                </div>
                                {/* Trạng thái */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Trạng thái</span>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã thanh toán' ? '#10b981' : selectedBill.status === 'Thất bại' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {selectedBill.status === 'Hoàn thành' ? 'Đã thanh toán' : selectedBill.status || '---'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowBillModal(false)}
                                style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', width: '100%' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
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
