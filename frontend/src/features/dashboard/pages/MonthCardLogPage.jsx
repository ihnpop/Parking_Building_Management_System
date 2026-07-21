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
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

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
                        status: log.status === 'Thành công' ? 'Hoàn thành' : log.status,
                        type: mappedType
                    };
                });
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
        let result = allLogs;

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

        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter((log) => {
                const logDate = new Date(log.timestamp || log.created_at);
                return logDate >= from;
            });
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((log) => {
                const logDate = new Date(log.timestamp || log.created_at);
                return logDate <= to;
            });
        }

        setLogs(result);
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

    const kpiFilteredLogs = useMemo(() => {
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        return filterRowsByTime(allLogs, kpiTimeFilter, dateStr);
    }, [allLogs, kpiTimeFilter, kpiDate, kpiMonth]);

    const kpiTotalTransactions = kpiFilteredLogs.length;
    const kpiPending = kpiFilteredLogs.filter(log => log.status === 'Chờ thanh toán').length;
    const kpiFailed = kpiFilteredLogs.filter(log => log.status === 'Thất bại').length;
    const kpiRevenue = kpiFilteredLogs
        .filter(log => log.status === 'Hoàn thành')
        .reduce((sum, log) => sum + parseAmount(log.amount), 0);

    const distTotal = kpiFilteredLogs.length;
    const distCompleted = kpiFilteredLogs.filter(log => log.status === 'Hoàn thành').length;
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

                    {/* Hoàn thành */}
                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Hoàn thành</span>
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
                    <label className="filter-label">KHOẢNG THỜI GIAN</label>
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
                {error && <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <div style={{ width: '100%', overflow: 'hidden' }}>
                            <table className="mc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '14%' }} /> {/* THỜI GIAN GIAO DỊCH */}
                                    <col style={{ width: '13%' }} /> {/* MÃ GIAO DỊCH */}
                                    <col style={{ width: '10%' }} /> {/* BIỂN SỐ */}
                                    <col style={{ width: '13%' }} /> {/* CHỦ XE */}
                                    <col style={{ width: '11%' }} /> {/* LOẠI GIAO DỊCH */}
                                    <col style={{ width: '10%' }} /> {/* PHÍ */}
                                    <col style={{ width: '10%' }} /> {/* THANH TOÁN */}
                                    <col style={{ width: '10%' }} /> {/* TRẠNG THÁI */}
                                    <col style={{ width: '9%' }} />  {/* HÓA ĐƠN */}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>THỜI GIAN GIAO DỊCH</th>
                                        <th>MÃ GIAO DỊCH</th>
                                        <th>BIỂN SỐ</th>
                                        <th>CHỦ XE</th>
                                        <th>LOẠI GIAO DỊCH</th>
                                        <th style={{ textAlign: 'right' }}>PHÍ</th>
                                        <th>THANH TOÁN</th>
                                        <th>TRẠNG THÁI</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>HÓA ĐƠN</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((log, index) => (
                                            <tr key={index} className="mc-table-row">
                                                <td className="log-time" style={{ fontFamily: 'monospace' }}>{log.time}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                                    {log.orderCode
                                                        ? <span title={log.orderCode} style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.orderCode}</span>
                                                        : <span style={{ color: '#ccc' }}>---</span>
                                                    }
                                                </td>
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
                                                        {log.status === 'Chờ thanh toán' && log.orderCode ? (
                                                            <button
                                                                type="button"
                                                                style={{ backgroundColor: '#006d38', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                                                title="Xử lý thanh toán giao dịch chờ"
                                                                onClick={() => handleOpenPendingModal(log)}
                                                            >
                                                                Thanh toán
                                                            </button>
                                                        ) : log.paymentMethod?.toLowerCase() === 'vnpay' ? (
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
                                            <td colSpan="9" className="table-status-empty">
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

            {/* Modal Xử lý giao dịch chờ thanh toán (Phân tách rõ Bước 4: Thanh toán -> Bước 5: Cấp thẻ RFID) */}
            {showPendingModal && selectedPendingLog && (
                <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '460px', maxWidth: '90%', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        
                        {/* Header Modal theo từng bước */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b', fontWeight: '700' }}>
                                    {pendingStep === 1 ? 'Bước 4: Xác nhận & Thanh toán' : 'Bước 5: Cấp thẻ RFID & Hoàn tất'}
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

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPendingModal(false)}
                                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                        disabled={actionLoading}
                                    >
                                        Hủy
                                    </button>
                                    {selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay' && pendingPayUrl && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(pendingPayUrl, '_blank')}
                                            style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                                            Thanh toán VNPay
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleStep1Payment}
                                        style={{ backgroundColor: '#006d38', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Đang kiểm tra...' : (selectedPendingLog.paymentMethod?.toLowerCase() === 'vnpay' ? 'Kiểm tra thanh toán VNPay' : 'Xác nhận thu tiền mặt')}
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

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPendingModal(false)}
                                        style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                        disabled={actionLoading}
                                    >
                                        Hủy
                                    </button>
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