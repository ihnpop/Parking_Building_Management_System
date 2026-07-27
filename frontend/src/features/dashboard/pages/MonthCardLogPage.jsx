import React, { useState, useEffect, useMemo } from 'react';
import { getMonthCardLogs } from '../../../service/monthCardApi';
import axios from 'axios';

function formatVND(amount) {
    const num = Number(amount);
    if (amount === null || amount === undefined || isNaN(num)) return '---';
    const formatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(num);
    return formatted.replace('₫', 'đ');
}

function parseAmount(amountStr) {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return amountStr;
    const cleanStr = String(amountStr).replace(/[^0-9]/g, '');
    return parseInt(cleanStr, 10) || 0;
}

function filterRowsByTime(rows, mode, dateStr) {
    if (!dateStr) return rows;
    return rows.filter((r) => {
        const t = r.timestamp || r.created_at || r.time || r.date || r.reported_at;
        if (!t) return false;

        let entry;
        const strT = String(t).trim();
        if (strT.includes('/')) {
            // Find the part that contains slashes (the date part)
            const datePart = strT.split(' ').find(p => p.includes('/')) || strT;
            const parts = datePart.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // YYYY/MM/DD
                    entry = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
                } else {
                    // DD/MM/YYYY
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

export default function MonthCardLogPage({ kpiTimeFilter, kpiDate, kpiMonth, refreshTrigger }) {
    const [allLogs, setAllLogs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Tất cả');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [showBillModal, setShowBillModal] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);

    // State cho Modal xử lý giao dịch Chờ thanh toán tại Nhật ký thẻ tháng (Tuân thủ luồng Bước 4: Thanh toán -> Bước 5: Cấp RFID)
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [selectedPendingLog, setSelectedPendingLog] = useState(null);
    const [pendingStep, setPendingStep] = useState(1); // 1: Bước 4 Thanh toán, 2: Bước 5 Cấp thẻ RFID
    const [pendingPayUrl, setPendingPayUrl] = useState(null);
    const [rfidCodeInput, setRfidCodeInput] = useState('');
    const [codeLoading, setCodeLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    // Mở modal xử lý giao dịch chờ (luôn bắt đầu ở Bước 1 - Thanh toán)
    const handleOpenPendingModal = async (log) => {
        setSelectedPendingLog(log);
        setPendingStep(1);
        setRfidCodeInput(log.cardNo && log.cardNo !== '---' ? log.cardNo : '');
        setPendingPayUrl(null);
        setActionError(null);
        setShowPendingModal(true);

        // Lấy link VNPay nếu là giao dịch VNPay
        if (log.paymentMethod?.toLowerCase() === 'vnpay') {
            try {
                const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/month-card/pending-registration`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (res.data?.pending?.payUrl) {
                    setPendingPayUrl(res.data.pending.payUrl);
                }
            } catch (e) {
                console.warn("Không thể tải tự động liên kết VNPay:", e);
            }
        }
    };

    // Tự động tải mã thẻ RFID khả dụng cho Bước 5
    const fetchNextRfidCode = async () => {
        try {
            setCodeLoading(true);
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/month-card/next-code`, { headers: authHeader });
            if (res.data?.code) {
                setRfidCodeInput(res.data.code);
            }
        } catch (err) {
            console.warn("Không thể tải tự động mã thẻ RFID:", err);
        } finally {
            setCodeLoading(false);
        }
    };

    // Bước 4: Xác nhận thanh toán (Tiền mặt / VNPay)
    const handleStep1Payment = async () => {
        if (!selectedPendingLog) return;
        try {
            setActionLoading(true);
            setActionError(null);
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

            if (selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay') {
                // Kiểm tra trạng thái VNPay theo loại giao dịch
                const statusEndpoint = selectedPendingLog.type === 'Gia hạn'
                    ? `${import.meta.env.VITE_API_URL}/month-card/renewal-status/${selectedPendingLog.orderCode}`
                    : `${import.meta.env.VITE_API_URL}/month-card/payment-status/${selectedPendingLog.orderCode}`;

                const res = await axios.get(statusEndpoint, { headers: authHeader });
                const currentStatus = res.data?.status || res.data?.data?.status;

                if (currentStatus !== 'Đã thanh toán' && currentStatus !== 'paid') {
                    throw new Error("Giao dịch VNPay chưa được hoàn tất thanh toán trên cổng VNPay. Vui lòng thanh toán rồi bấm kiểm tra lại.");
                }
            } else {
                // Xác nhận thu tiền mặt
                if (selectedPendingLog.type === 'Gia hạn') {
                    await axios.post(`${import.meta.env.VITE_API_URL}/month-card/confirm-renewal-cash/${selectedPendingLog.orderCode}`, {}, { headers: authHeader });
                } else {
                    await axios.post(`${import.meta.env.VITE_API_URL}/month-card/confirm-cash-payment/${selectedPendingLog.orderCode}`, {}, { headers: authHeader });
                }
            }

            // Nếu là Gia hạn -> Hoàn tất ngay lập tức
            if (selectedPendingLog.type === 'Gia hạn') {
                setShowPendingModal(false);
                setSelectedPendingLog(null);
                fetchLogs();
                return;
            }

            // Nếu là Cấp mới -> Chuyển sang Bước 5: Cấp thẻ RFID
            setPendingStep(2);
            await fetchNextRfidCode();

        } catch (err) {
            console.error("Lỗi xác nhận thanh toán:", err);
            setActionError(err.response?.data?.error || err.response?.data?.message || err.message || "Xác nhận thanh toán thất bại.");
        } finally {
            setActionLoading(false);
        }
    };

    // Bước 5: Cấp thẻ RFID và Hoàn tất đăng ký
    const handleStep2Finalize = async () => {
        if (!selectedPendingLog) return;
        if (!rfidCodeInput || !rfidCodeInput.trim()) {
            setActionError("Vui lòng nhập hoặc xác nhận mã thẻ RFID.");
            return;
        }
        try {
            setActionLoading(true);
            setActionError(null);
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(`${import.meta.env.VITE_API_URL}/month-card/finalize-registration`, {
                card_code: rfidCodeInput.trim(),
                payment_method: selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay' ? 'vnpay' : 'cash',
                orderCode: selectedPendingLog.orderCode
            }, { headers: authHeader });

            setShowPendingModal(false);
            setSelectedPendingLog(null);
            fetchLogs();
        } catch (err) {
            console.error("Lỗi hoàn tất đăng ký:", err);
            setActionError(err.response?.data?.error || err.response?.data?.message || err.message || "Hoàn tất đăng ký thẻ thất bại.");
        } finally {
            setActionLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let data = await getMonthCardLogs();
            if (data) {
                data = data.map(log => {
                    let mappedType = log.type;
                    if (mappedType === 'Gia hạn nối tiếp') mappedType = 'Gia hạn';
                    return {
                        ...log,
                        status: (log.status === 'Thành công' || log.status === 'Đã xong' || log.status === 'Đã thanh toán' || log.status === 'Hoàn thành') ? 'Đã xong' : log.status,
                        type: mappedType
                    };
                }).filter(log => !(log.status === 'Chờ thanh toán' && log.type === 'Gia hạn'));
            }
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
    }, [refreshTrigger]);

    // Auto-refresh mỗi 1 giờ để cập nhật trạng thái giao dịch Chờ thanh toán
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLogs();
        }, 3600000);
        return () => clearInterval(interval);
    }, []);

    const handleFilter = () => {
        // Áp dụng bộ lọc thời gian từ top-level KPI time filter
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        let result = filterRowsByTime(allLogs, kpiTimeFilter, dateStr);

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(
                (log) =>
                    (log.plate || '').toLowerCase().includes(q) ||
                    (log.owner || '').toLowerCase().includes(q) ||
                    (log.orderCode || '').toLowerCase().includes(q)
            );
        }

        if (typeFilter !== 'Tất cả') {
            result = result.filter((log) => log.type === typeFilter);
        }

        if (statusFilter !== 'Tất cả') {
            result = result.filter((log) => log.status === statusFilter);
        }

        setLogs(result);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [search, typeFilter, statusFilter, allLogs, kpiTimeFilter, kpiDate, kpiMonth]);

    // Helper định dạng cột Thời gian thành 2 dòng dọc (Dòng 1: Giờ 12:40:43, Dòng 2: Ngày 21/07/2026 UTC+7)
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

    const getStatusClass = (status) => {
        switch (status) {
            case 'Đã xong':
            case 'Hoàn thành': return 'success';
            case 'Chờ thanh toán': return 'pending';
            case 'Thất bại': return 'failed';
            default: return '';
        }
    };

    const kpiFilteredLogs = useMemo(() => {
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        return filterRowsByTime(allLogs, kpiTimeFilter, dateStr);
    }, [allLogs, kpiTimeFilter, kpiDate, kpiMonth]);

    const kpiTotalTransactions = kpiFilteredLogs.length;
    const kpiPending = kpiFilteredLogs.filter(log => log.status === 'Chờ thanh toán').length;
    const kpiFailed = kpiFilteredLogs.filter(log => log.status === 'Thất bại').length;
    const kpiRevenue = kpiFilteredLogs
        .filter(log => log.status === 'Hoàn thành' || log.status === 'Đã xong')
        .reduce((sum, log) => sum + parseAmount(log.amount), 0);

    const distTotal = kpiFilteredLogs.length;
    const distCompleted = kpiFilteredLogs.filter(log => log.status === 'Hoàn thành' || log.status === 'Đã xong').length;
    const distPending = kpiFilteredLogs.filter(log => log.status === 'Chờ thanh toán').length;
    const distFailed = kpiFilteredLogs.filter(log => log.status === 'Thất bại').length;

    const pct = (count) => distTotal > 0 ? Math.round((count / distTotal) * 100) : 0;
    const pctWidth = (count) => `${pct(count)}%`;

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
        <div className="lost-card-log-wrapper">           {/* ĐÃ XÓA KHỐI HEADER VÀ PROFILE LẶP LẠI TẠI ĐÂY */}

            {/* Stats Grid */}
            <div className="lost-kpi-container" style={{ marginBottom: "24px" }}>
                <div className="lost-kpi-grid">
                    {/* Ô 1: Tổng giao dịch */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <span className="lost-kpi-title">Tổng giao dịch</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{loading ? '...' : kpiTotalTransactions}</div>
                            <div className="lost-kpi-footer txt-gray">Ghi nhận giao dịch</div>
                        </div>
                    </div>

                    {/* Ô 2: Chờ thanh toán */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-yellow">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                            <span className="lost-kpi-title">Chờ thanh toán</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-yellow">{loading ? '...' : kpiPending}</div>
                            <div className="lost-kpi-footer txt-yellow">Giao dịch đang xử lý</div>
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
                            <div className="lost-kpi-value val-red">{loading ? '...' : kpiFailed}</div>
                            <div className="lost-kpi-footer txt-red">Phiên lỗi / sự cố</div>
                        </div>
                    </div>

                    {/* Ô 4: Doanh thu vé tháng */}
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-orange">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <span className="lost-kpi-title">Doanh thu vé tháng</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-orange" style={{ fontSize: '1.1rem' }}>
                                {loading ? '...' : formatVND(kpiRevenue)}
                            </div>
                            <div className="lost-kpi-footer txt-orange">Giao dịch đã hoàn thành</div>
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
                            <span><span className="lost-dist-val">{distTotal}</span> <span className="lost-dist-pct">(100%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* Đã xong */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đã xong</span>
                            <span><span className="lost-dist-val">{distCompleted}</span> <span className="lost-dist-pct">({pct(distCompleted)}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: pctWidth(distCompleted) }}></div>
                        </div>
                    </div>

                    {/* Chờ thanh toán */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Chờ thanh toán</span>
                            <span><span className="lost-dist-val">{distPending}</span> <span className="lost-dist-pct">({pct(distPending)}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-yellow" style={{ width: pctWidth(distPending) }}></div>
                        </div>
                    </div>

                    {/* Thất bại */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Thất bại</span>
                            <span><span className="lost-dist-val">{distFailed}</span> <span className="lost-dist-pct">({pct(distFailed)}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-red" style={{ width: pctWidth(distFailed) }}></div>
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
                            placeholder="Biển số, Chủ xe, Mã GD..."
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
                            <option value="Đã xong">Đã xong</option>
                            <option value="Chờ thanh toán">Chờ thanh toán</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                {/* Nút reset filter */}
                {(search || typeFilter !== 'Tất cả' || statusFilter !== 'Tất cả') && (
                    <div className="filter-block reset-filter-btn-container" style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            type="button"
                            className="icon-reset-btn"
                            title="Xóa lọc"
                            onClick={() => {
                                setSearch('');
                                setTypeFilter('Tất cả');
                                setStatusFilter('Tất cả');
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>filter_alt_off</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <section className="lost-table-card">
                {error && <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="mc-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '920px' }}>
                                <colgroup>
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '17%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '17%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '8%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>THỜI GIAN</th>
                                        <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>MÃ GIAO DỊCH</th>
                                        <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>BIỂN SỐ</th>
                                        <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>CHỦ XE</th>
                                        <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>LOẠI GIAO DỊCH</th>
                                        <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>PHÍ</th>
                                        <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                                        <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>HÓA ĐƠN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((log, index) => (
                                            <tr key={index} className="mc-table-row">
                                                <td style={{ textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{renderFormattedTime(log.timestamp || log.time)}</td>
                                                <td style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {log.orderCode
                                                        ? <span title={log.orderCode}>{log.orderCode}</span>
                                                        : <span style={{ color: '#ccc' }}>---</span>
                                                    }
                                                </td>
                                                <td className="mc-td-bold" style={{ textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.plate}</td>
                                                <td style={{ textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{log.owner}</td>
                                                <td style={{ textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.type}</td>
                                                <td className="log-amount log-amount-cell" style={{ textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.amount}</td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <span className={`status-badge-log ${getStatusClass(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '28px' }}>
                                                        {log.status === 'Chờ thanh toán' && log.orderCode ? (
                                                            <button
                                                                type="button"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Xử lý thanh toán giao dịch chờ"
                                                                onClick={() => handleOpenPendingModal(log)}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                title="Xem thông tin giao dịch"
                                                                onClick={() => {
                                                                    setSelectedBill(log);
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
                            <span className="footer-info">Hiển thị {logs.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, logs.length)} trong số {logs.length} giao dịch</span>
                            <div className="lost-pagination">
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

            {/* Transaction Detail Modal */}
            {showBillModal && selectedBill && (
                <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '420px', maxWidth: '92%', padding: '0', boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                        {/* Header with status icon */}
                        <div style={{ background: (selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã xong') ? 'linear-gradient(135deg, #10b981, #059669)' : selectedBill.status === 'Thất bại' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '28px 24px 20px', textAlign: 'center', position: 'relative' }}>
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
                                    {(selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã xong') ? 'check_circle' : selectedBill.status === 'Thất bại' ? 'cancel' : 'schedule'}
                                </span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: '600' }}>Thông tin giao dịch</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                                {(selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã xong') ? 'Giao dịch thành công' : selectedBill.status === 'Thất bại' ? 'Giao dịch thất bại' : 'Giao dịch đang xử lý'}
                            </p>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {/* Mã giao dịch */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Mã giao dịch</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedBill.orderCode || selectedBill.paymentInfo?.transaction_no || selectedBill.paymentInfo?.order_code || ''}>
                                        {selectedBill.orderCode || selectedBill.paymentInfo?.transaction_no || selectedBill.paymentInfo?.order_code || '---'}
                                    </span>
                                </div>
                                {/* Loại giao dịch */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Loại giao dịch</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{selectedBill.type || '---'}</span>
                                </div>
                                {/* Số tiền */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Số tiền</span>
                                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{selectedBill.amount || '---'}</span>
                                </div>
                                {/* Phương thức thanh toán */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Phương thức</span>
                                    <span className={`method-badge ${selectedBill.paymentMethod?.toLowerCase() === 'vnpay' ? 'method-vnpay' : 'method-cash'}`} style={{ fontSize: '12px' }}>
                                        {selectedBill.paymentMethod || 'Tiền mặt'}
                                    </span>
                                </div>
                                {/* Thời gian */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Thời gian</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                                        {selectedBill.paymentInfo?.paid_at
                                            ? new Date(selectedBill.paymentInfo.paid_at).toLocaleString('vi-VN')
                                            : selectedBill.time || '---'}
                                    </span>
                                </div>
                                {/* Trạng thái */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Trạng thái</span>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: (selectedBill.status === 'Hoàn thành' || selectedBill.status === 'Đã xong') ? '#10b981' : selectedBill.status === 'Thất bại' ? '#ef4444' : '#f59e0b'
                                    }}>
                                        {selectedBill.status || '---'}
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

            {/* Modal Xử lý giao dịch chờ thanh toán (Phân tách rõ Bước 4: Thanh toán -> Bước 5: Cấp thẻ RFID) */}
            {showPendingModal && selectedPendingLog && (
                <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '460px', maxWidth: '90%', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>

                        {/* Header Modal theo từng bước */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b', fontWeight: '700' }}>
                                    {pendingStep === 1 ? 'Tiếp tục thanh toán' : 'Cấp thẻ RFID & Hoàn tất'}
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    {pendingStep === 1 ? 'Thanh toán cho đơn hàng đã khởi tạo' : 'Kích hoạt thẻ tháng cho khách hàng'}
                                </p>
                            </div>
                            <button onClick={() => setShowPendingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {actionError && (
                            <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
                                {actionError}
                            </div>
                        )}

                        {/* BƯỚC 4: THANH TOÁN (Không hiển thị ô nhập thẻ RFID ở bước này) */}
                        {pendingStep === 1 && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#334155', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Mã giao dịch:</span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{selectedPendingLog.orderCode}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Khách hàng:</span>
                                        <span>{selectedPendingLog.owner}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Biển số xe:</span>
                                        <span style={{ fontWeight: '600' }}>{selectedPendingLog.plate}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Loại giao dịch:</span>
                                        <span>{selectedPendingLog.type}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Số tiền:</span>
                                        <span style={{ color: '#ef4444', fontWeight: '700' }}>{selectedPendingLog.amount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Hình thức thanh toán:</span>
                                        <span style={{ fontWeight: '600' }}>{selectedPendingLog.paymentMethod || 'Tiền mặt'}</span>
                                    </div>
                                </div>

                                <div className="pending-modal-footer">
                                    {selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay' && pendingPayUrl && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(pendingPayUrl, '_blank')}
                                            className="btn-vnpay-open"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                                            Thanh toán VNPay
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleStep1Payment}
                                        className="btn-vnpay-check"
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? (
                                            'Đang kiểm tra...'
                                        ) : selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay' ? (
                                            <>
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>published_with_changes</span>
                                                Kiểm tra thanh toán
                                            </>
                                        ) : (
                                            'Xác nhận thu tiền mặt'
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* BƯỚC 5: CẤP THẺ RFID & HOÀN TẤT (Chỉ xuất hiện SAU KHI Bước 4 thanh toán thành công) */}
                        {pendingStep === 2 && (
                            <>
                                <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
                                    ✓ Thanh toán đã được xác nhận thành công! Vui lòng nhập hoặc xác nhận mã thẻ RFID bên dưới để hoàn tất cấp thẻ.
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Khách hàng:</span>
                                        <span>{selectedPendingLog.owner}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '600', color: '#475569' }}>Biển số xe:</span>
                                        <span style={{ fontWeight: '600' }}>{selectedPendingLog.plate}</span>
                                    </div>

                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                                            Mã thẻ RFID {codeLoading && '(Đang tải mã tự động...)'}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nhập mã thẻ RFID (VD: MC-001)..."
                                            value={rfidCodeInput}
                                            onChange={(e) => setRfidCodeInput(e.target.value.toUpperCase())}
                                            disabled={codeLoading || actionLoading}
                                            style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}
                                        />
                                    </div>
                                </div>

                                <div className="pending-modal-footer">
                                    <button
                                        type="button"
                                        onClick={handleStep2Finalize}
                                        style={{ backgroundColor: '#006d38', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                        disabled={actionLoading || codeLoading}
                                    >
                                        {actionLoading ? 'Đang kích hoạt...' : '🏁 Hoàn tất đăng ký'}
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}