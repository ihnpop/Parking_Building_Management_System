import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createLostCard } from "../../../service/cardApi";
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';

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

function filterRowsByTime(rows, mode, dateStr) {
    if (!dateStr) return rows;
    return rows.filter((r) => {
        const t = r.reported_at || r.date || r.timestamp || r.created_at || r.time;
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

export default function LostCardLogPage({ showBackButton = false, kpiTimeFilter, kpiDate, kpiMonth }) {
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const { user, userRole, logout } = useAuth();

    // Dropdown state for profile
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Lấy tên hiển thị: ưu tiên full_name → name → email
    const currentUserName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email
        || '---';

    const userEmail = user?.email || 'admin@parkflow.com';
    const userInitials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.substring(0, 2).toUpperCase()
        : userEmail.substring(0, 2).toUpperCase();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const getRoleLabel = (r) => {
        if (!r) return 'Nhân viên';
        switch (r.toUpperCase()) {
            case 'ADMIN': return 'Quản trị viên';
            case 'MANAGER': return 'Quản lý';
            case 'STAFF': return 'Nhân viên';
            default: return r;
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States dùng cho bộ lọc
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    // Phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Trạng thái hiển thị modal tạo báo mất thẻ
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [resolveNote, setResolveNote] = useState('');

    // Dữ liệu nhập vào của form báo mất thẻ mới
    const [newLostCard, setNewLostCard] = useState({
        plate_number: '',
        description: ''
    });

    const [historyData, setHistoryData] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const historyItemsPerPage = 5;

    // States và Effect cho chức năng Cấp lại thẻ tháng bị mất
    const [showReissueForm, setShowReissueForm] = useState(false);
    const [newRfidCode, setNewRfidCode] = useState('');
    const [reissueStartDate, setReissueStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [reissuePayMethod, setReissuePayMethod] = useState('vnpay'); // 'vnpay' | 'cash' | 'defer'
    const [showCashPanel, setShowCashPanel] = useState(false);
    const [cashPanelData, setCashPanelData] = useState({ orderCode: '', amount: 50000 });
    const [cashConfirmSuccess, setCashConfirmSuccess] = useState(false);

    useEffect(() => {
        if (editingCard?.pendingPayment) {
            setShowReissueForm(true);
            setNewRfidCode(editingCard.pendingPayment.newCode || '');
            setReissuePayMethod(editingCard.pendingPayment.paymentMethod);
            if (editingCard.pendingPayment.paymentMethod === 'cash') {
                setShowCashPanel(true);
                setCashPanelData({
                    orderCode: editingCard.pendingPayment.orderCode,
                    amount: editingCard.pendingPayment.amount
                });
            } else {
                setShowCashPanel(false);
            }
            setCashConfirmSuccess(false);
        } else {
            // Reset form cấp lại thẻ khi đóng modal hoặc đổi thẻ đang xem
            setShowReissueForm(false);
            setNewRfidCode('');
            setReissueStartDate(new Date().toISOString().split('T')[0]);
            setReissuePayMethod('vnpay');
            setShowCashPanel(false);
            setCashPanelData({ orderCode: '', amount: 50000 });
            setCashConfirmSuccess(false);
        }
    }, [editingCard]);

    const handleReissueCard = async (paymentMethod = 'vnpay') => {
        if (!newRfidCode.trim()) {
            showToast('Vui lòng nhập mã thẻ RFID mới!', 'error');
            return;
        }
        if (!editingCard?.card_id) {
            // Dữ liệu cũ (trước khi backend cập nhật) — tự động làm mới và yêu cầu thử lại
            showToast('Đang làm mới dữ liệu, vui lòng mở lại báo cáo và thử lại...', 'info');
            await fetchLostCards();
            setEditingCard(null);
            return;
        }
        if (!editingCard?.raw_report_id) {
            showToast('Thiếu mã báo cáo gốc. Vui lòng tải lại trang.', 'error');
            return;
        }
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');

            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/reissue`,
                {
                    cardId: editingCard.card_id,
                    newCode: newRfidCode.trim(),
                    reportId: editingCard.raw_report_id,
                    paymentMethod
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (paymentMethod === 'defer') {
                showToast('Đã cấp lại thẻ, phí sẽ thu sau!', 'success');
                setEditingCard(null);
                await fetchLostCards();
                return;
            }

            if (paymentMethod === 'cash') {
                showToast('Đã khởi tạo yêu cầu thu tiền mặt thành công!', 'success');
                const orderCode = res.data?.data?.order_code || `REISSUE-${Date.now()}`;
                setCashPanelData({ orderCode, amount: 50000 });
                setShowCashPanel(true);
                setCashConfirmSuccess(false);
                await fetchLostCards();
                return;
            }

            // VNPay
            showToast('Đã khởi tạo giao dịch thanh toán VNPay!', 'success');
            const payUrl = res.data?.data?.payUrl;
            if (payUrl) {
                window.location.href = payUrl;
            }
            await fetchLostCards();
            setEditingCard(null);
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể cấp lại thẻ';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmReissueCash = async () => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
            await axios.post(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/confirm-reissue-cash/${cashPanelData.orderCode}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCashConfirmSuccess(true);
            showToast('Xác nhận thu tiền mặt thành công!', 'success');
            await fetchLostCards();
            setTimeout(() => setEditingCard(null), 1500);
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể xác nhận thu tiền mặt';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewHistory = async () => {
        try {
            setHistorySearch('');
            setHistoryPage(1);
            setHistoryLoading(true);
            setShowHistoryModal(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/history`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setHistoryData(res.data.data || []);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Không thể tải lịch sử';
            showToast(message, 'error');
            setShowHistoryModal(false);
        } finally {
            setHistoryLoading(false);
        }
    };


    // RULE #4 - Tiếp nhận xử lý report (Đang chờ -> Đang xử lý).
    // Gọi đúng API state-machine mới, không tự sửa status tùy tiện như trước.
    const handleAcceptReport = async () => {
        if (!editingCard?.raw_report_id) {
            showToast('Thiếu mã báo cáo gốc (raw_report_id) - không thể tiếp nhận. Vui lòng tải lại trang.', 'error');
            return;
        }
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/${editingCard.raw_report_id}/accept`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Đã tiếp nhận xử lý báo cáo.', 'success');
            // Cập nhật tên người xử lý ngay lập tức trên UI
            setEditingCard(prev => ({
                ...prev,
                handler_name: currentUserName,
                status: 'Đang xử lý'
            }));
            await fetchLostCards();
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể tiếp nhận xử lý';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Hủy report do tạo nhầm (Đang chờ -> Đã hủy (tạo nhầm)).
    // CHỈ cho phép khi report còn 'Đang chờ' - backend sẽ tự chặn nếu sai state.
    // Khác với "Hủy thẻ" ở resolveLostCardReport: thẻ hoàn toàn không có vấn đề,
    // nên hành động này sẽ MỞ KHÓA lại thẻ ngay.
    const handleCancelReport = async () => {
        if (!editingCard?.raw_report_id) {
            showToast('Thiếu mã báo cáo gốc (raw_report_id) - không thể hủy report. Vui lòng tải lại trang.', 'error');
            return;
        }
        const confirmed = window.confirm(
            'Hủy report này do tạo nhầm? Thẻ sẽ được MỞ KHÓA lại ngay lập tức.'
        );
        if (!confirmed) return;

        try {
            setActionLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/${editingCard.raw_report_id}/cancel`,
                { note: resolveNote || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Đã hủy report và mở khóa lại thẻ.', 'success');
            setResolveNote('');
            await fetchLostCards();
            setEditingCard(null);
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể hủy report';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // RULE #4 - Đóng report: tìm lại thẻ (Tìm lại thẻ) hoặc hủy thẻ vĩnh viễn (Hủy thẻ).
    // Chỉ gọi được khi report đang ở trạng thái 'Đang xử lý' (backend tự chặn nếu sai state).
    const handleResolveReport = async (resolution) => {
        if (!editingCard?.raw_report_id) {
            showToast('Thiếu mã báo cáo gốc (raw_report_id) - không thể đóng report. Vui lòng tải lại trang.', 'error');
            return;
        }
        if (resolution === 'Hủy thẻ') {
            const confirmed = window.confirm(
                'Hủy thẻ là thao tác KHÔNG THỂ hoàn tác - thẻ sẽ bị vô hiệu hóa vĩnh viễn. Bạn chắc chắn muốn tiếp tục?'
            );
            if (!confirmed) return;
        }
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('access_token');
            await axios.put(
                `${import.meta.env.VITE_API_URL}/cards/lost-card/${editingCard.raw_report_id}/resolve`,
                { resolution, note: resolveNote || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast(
                resolution === 'Tìm lại thẻ' ? 'Đã đóng report: tìm lại được thẻ.' : 'Đã đóng report: hủy thẻ vĩnh viễn.',
                'success'
            );
            setResolveNote('');
            await fetchLostCards();
            setEditingCard(null);
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể đóng report';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Bắt buộc nhập biển số xe và lí do trước khi tạo báo mất
    const handleCreateLostCard = async () => {
        if (!newLostCard.plate_number.trim()) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }
        if (!newLostCard.description.trim()) {
            showToast('Vui lòng nhập lí do báo mất.', 'error');
            return;
        }
        try {
            // Tạo payload gửi đi từ dữ liệu form (description đã được validate không rỗng ở trên)
            const payload = {
                plate_number: newLostCard.plate_number,
                description: newLostCard.description
            };

            // Gọi API tạo báo mất thẻ mới
            await createLostCard(payload);
            // Tải lại danh sách nhật ký mất thẻ mới nhất
            await fetchLostCards();
            // Đóng modal và reset dữ liệu form về mặc định
            setShowCreateModal(false);
            setNewLostCard({
                plate_number: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            // Hiển thị thông báo lỗi chi tiết từ Server nếu có
            const message = err.response?.data?.message || err.message || 'Không thể tạo báo mất';
            showToast(message, 'error');
        }
    };
    const fetchLostCards = async () => {
        try {
            setLoading(true);
            setError(null);
            // const response = await axios.get('http://localhost:3636/api/cards/lost-card'); đổi dòng này*********
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/cards/lost-card`);
            const data = response.data.data || response.data;

            if (Array.isArray(data)) {
                setLostCards(data);
                setFilteredCards(data);
            } else {
                setLostCards([]);
                setFilteredCards([]);
            }
        } catch (err) {
            console.error("Error fetching lost cards:", err);
            setError("Không thể tải nhật ký mất thẻ. Vui lòng kiểm tra kết nối Backend!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLostCards();
    }, []);

    // Xử lý bộ lọc tìm kiếm và đồng bộ 3 trạng thái hiển thị
    const handleFilter = () => {
        // Áp dụng bộ lọc thời gian từ top-level KPI time filter
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        let filtered = filterRowsByTime(lostCards, kpiTimeFilter, dateStr);

        filtered = filtered.filter((row) => {
            const cardCode = (row.card_code || row.cardNo || '').toLowerCase();
            const plateNumber = (row.plate_number || row.plate || '').toLowerCase();
            const customerName = (row.customer_name || row.owner || '').toLowerCase();
            const reportId = (row.lost_report_id || row.id || '').toLowerCase();
            const searchKey = search.toLowerCase();

            const matchesSearch =
                cardCode.includes(searchKey) ||
                plateNumber.includes(searchKey) ||
                customerName.includes(searchKey) ||
                reportId.includes(searchKey);

            // Đồng bộ chuỗi chữ trạng thái
            const currentStatus = row.status || 'Đang chờ';
            const matchesStatus = statusFilter === 'Tất cả' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
        setFilteredCards(filtered);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [statusFilter, search, lostCards, kpiTimeFilter, kpiDate, kpiMonth]);

    const renderPlate = (plateStr) => {
        if (!plateStr || plateStr === "N/A" || plateStr === "Chưa có xe") {
            return <div className="lost-plate-box">---</div>;
        }
        const parts = plateStr.split('-');
        if (parts.length === 2) {
            return (
                <div className="lost-plate-box">
                    <div className="lost-plate-top">{parts[0]}</div>
                    <div className="lost-plate-bottom">{parts[1]}</div>
                </div>
            );
        }
        return <div className="lost-plate-box">{plateStr}</div>;
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Đang chờ':
                return 'status-pending';
            case 'Đang xử lý':
                return 'status-processing';
            case 'Đã xong':
            case 'Đã tìm lại':
                return 'status-recovered';
            case 'Đã hủy thẻ':
                return 'status-cancelled';
            case 'Đã hủy (tạo nhầm)':
                return 'status-cancelled-mistake';
            default:
                return '';
        }
    };

    // Thống kê số liệu
    const kpiFilteredCards = useMemo(() => {
        const dateStr = kpiTimeFilter === 'day' ? kpiDate : kpiMonth;
        return filterRowsByTime(lostCards, kpiTimeFilter, dateStr);
    }, [lostCards, kpiTimeFilter, kpiDate, kpiMonth]);

    const totalLost = kpiFilteredCards.length;
    const pendingCount = kpiFilteredCards.filter(c => c.status === 'Đang chờ').length;
    const processingCount = kpiFilteredCards.filter(c => c.status === 'Đang xử lý').length;
    const resolvedCount = kpiFilteredCards.filter(c => c.status === 'Đã xong' || c.status === 'Đã tìm lại' || c.status === 'Đã xử lý').length;
    const cancelledCount = kpiFilteredCards.filter(c => c.status === 'Đã hủy thẻ').length;
    const mistakeCount = kpiFilteredCards.filter(c => c.status === 'Đã hủy (tạo nhầm)').length;

    // Pagination logic
    const totalPages = Math.ceil(filteredCards.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredCards.slice(startIndex, startIndex + itemsPerPage);

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
        <section className={showBackButton ? "stats-dashboard-page" : ""}>
            {showBackButton && (
                <header className="stats-top-bar">
                    <button className="stats-back-btn" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Quay lại
                    </button>
                    <h1 className="stats-page-title">Nhật ký báo mất thẻ</h1>

                    <div className="stats-header-right">
                        <div className="avatar-wrapper" ref={dropdownRef}>
                            <div className="stats-profile" onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer' }}>
                                <div className="profile-text">
                                    <span className="profile-name">{userEmail}</span>
                                </div>
                                <div className="profile-avatar">{userInitials[0]}</div>
                            </div>

                            {showDropdown && (
                                <div className="user-dropdown" style={{ top: '50px' }}>
                                    <div className="user-dropdown-info">
                                        <div className="user-dropdown-email">{userEmail}</div>
                                        <div className="user-dropdown-role">{getRoleLabel(userRole)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="user-dropdown-item"
                                        onClick={handleLogout}
                                    >
                                        <span className="material-symbols-outlined">logout</span>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
            )}
            <div className={showBackButton ? "stats-container" : "lost-card-log-wrapper"} style={showBackButton ? { display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' } : {}}>
                {/* Stats Cards */}
                <div className="lost-kpi-container">
                    <div className="lost-kpi-grid">
                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-gray">
                                    <span className="material-symbols-outlined">badge</span>
                                </div>
                                <span className="lost-kpi-title">Tổng thẻ báo mất</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value">{totalLost}</div>
                                <div className="lost-kpi-footer txt-gray">Hệ thống tổng hợp</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-red">
                                    <span className="material-symbols-outlined">assignment_late</span>
                                </div>
                                <span className="lost-kpi-title">Đang chờ xử lý</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-red">{pendingCount}</div>
                                <div className="lost-kpi-footer txt-orange">Chờ tiếp nhận</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-blue">
                                    <span className="material-symbols-outlined">sync</span>
                                </div>
                                <span className="lost-kpi-title">Đang xử lý</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-blue">{processingCount}</div>
                                <div className="lost-kpi-footer txt-blue">Đối chiếu hình ảnh</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-green">
                                    <span className="material-symbols-outlined">check_circle</span>
                                </div>
                                <span className="lost-kpi-title">Đã xong</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-green">{resolvedCount}</div>
                                <div className="lost-kpi-footer txt-green">Giải quyết xong</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-red">
                                    <span className="material-symbols-outlined">credit_card_off</span>
                                </div>
                                <span className="lost-kpi-title">Đã hủy thẻ</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-red">{cancelledCount}</div>
                                <div className="lost-kpi-footer txt-red">Vô hiệu hóa thẻ</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-gray">
                                    <span className="material-symbols-outlined">undo</span>
                                </div>
                                <span className="lost-kpi-title">Đã hủy (tạo nhầm)</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value">{mistakeCount}</div>
                                <div className="lost-kpi-footer txt-gray">Đã hủy báo cáo</div>
                            </div>
                        </div>
                    </div>

                    <div className="lost-dist-card">
                        <div className="lost-dist-title">
                            <span className="material-symbols-outlined">monitoring</span>
                            Tỷ lệ phân phối xử lý
                        </div>
                        <hr className="lost-dist-divider" />

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Mốc tổng thẻ</span>
                                <span><span className="lost-dist-val">{totalLost}</span> <span className="lost-dist-pct">(100%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đang chờ</span>
                                <span><span className="lost-dist-val">{pendingCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((pendingCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-gray" style={{ width: `${totalLost > 0 ? (pendingCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đang xử lý</span>
                                <span><span className="lost-dist-val">{processingCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((processingCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-blue" style={{ width: `${totalLost > 0 ? (processingCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đã xong</span>
                                <span><span className="lost-dist-val">{resolvedCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((resolvedCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-green" style={{ width: `${totalLost > 0 ? (resolvedCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đã hủy thẻ</span>
                                <span><span className="lost-dist-val">{cancelledCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((cancelledCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-red" style={{ width: `${totalLost > 0 ? (cancelledCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đã hủy (tạo nhầm)</span>
                                <span><span className="lost-dist-val">{mistakeCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((mistakeCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-gray" style={{ width: `${totalLost > 0 ? (mistakeCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="lost-filter-card">
                    <div className="filter-block">
                        <label className="filter-label">Tìm kiếm nâng cao</label>
                        <div className="filter-input-wrapper">
                            <span className="material-symbols-outlined icon-left">search</span>
                            <input
                                type="text"
                                className="filter-input has-icon-left"
                                placeholder="Nhập mã báo mất, mã thẻ, biển số, chủ xe..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-block">
                        <label className="filter-label">Trạng thái xử lý</label>
                        <div className="filter-input-wrapper">
                            <select
                                className="filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="Tất cả">Tất cả trạng thái</option>
                                <option value="Đang chờ">Đang chờ</option>
                                <option value="Đang xử lý">Đang xử lý</option>
                                <option value="Đã xong">Đã xong</option>
                                <option value="Đã hủy thẻ">Đã hủy thẻ</option>
                                <option value="Đã hủy (tạo nhầm)">Đã hủy (tạo nhầm)</option>
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

                    <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', paddingBottom: '2px', marginLeft: 'auto' }}>
                        <button type="button" className="icon-reset-btn" title="Xem lịch sử xử lý" onClick={handleViewHistory}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                        </button>
                        <button type="button" className="lost-create-button" onClick={() => setShowCreateModal(true)}>
                            <span className="material-symbols-outlined">add</span>
                            Tạo báo mất
                        </button>
                    </div>
                </div>

                {/* Table */}
                <section className="lost-table-card">
                    {error && (
                        <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                            Đang tải nhật ký mất thẻ...
                        </div>
                    ) : (
                        <>
                            <table className="lost-table">
                                <thead>
                                    <tr>
                                        <th>MÃ BÁO MẤT</th>
                                        <th>MÃ THẺ</th>
                                        <th>BIỂN SỐ XE</th>
                                        <th>LOẠI THẺ</th>
                                        <th>NGÀY BÁO MẤT</th>
                                        <th>NỘI DUNG</th>
                                        <th>TRẠNG THÁI</th>
                                        <th>NGƯỜI XỬ LÝ</th>
                                        <th>THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length > 0 ? (
                                        currentData.map((row, index) => {
                                            const reportId = row.lost_report_id || row.id;
                                            const cardCode = row.card_code || row.cardNo;
                                            const plateNumber = row.plate_number || row.plate;
                                            const cardType = row.card_type || 'Thẻ lượt';
                                            const reportDate = row.reported_at || row.date;
                                            const content = row.description || row.reason || '---';

                                            return (
                                                <tr key={reportId}>
                                                    <td className="lost-id-cell">{reportId}</td>
                                                    <td>{cardCode}</td>
                                                    <td>{renderPlate(plateNumber)}</td>
                                                    <td>{cardType}</td>
                                                    <td style={{ textAlign: 'left' }}>
                                                        {renderFormattedTime(reportDate)}
                                                    </td>
                                                    <td className="lost-content-cell" title={content}>{content}</td>
                                                    <td>
                                                        <span className={`status-badge-lost ${getStatusClass(row.status)}`}>
                                                            <span className="dot"></span>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td>{row.handler_name || '---'}</td>
                                                    <td>
                                                        <button type="button" className="lost-action-btn" onClick={() => { setEditingCard(row); setResolveNote(''); }}>
                                                            <span className="material-symbols-outlined">edit</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                                Không tìm thấy dữ liệu phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Footer */}
                            <div className="lost-table-footer">
                                <span className="footer-info">Hiển thị {filteredCards.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredCards.length)} trong số {filteredCards.length} báo cáo</span>
                                <div className="footer-right-actions">
                                    <div className="lost-pagination">
                                        <button
                                            type="button"
                                            className="page-btn"
                                            disabled={currentPage === 1}
                                            onClick={() => handlePageChange(currentPage - 1)}
                                        >
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>

                                        {getPageNumbers().map(page => (
                                            <button
                                                key={page}
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
                            </div>
                        </>
                    )}
                </section>

                {editingCard && (
                    <div className="lost-modal-overlay">
                        <div className="lost-modal">
                            <div className="lost-modal-header">
                                <h2>Xử lý báo cáo mất thẻ</h2>
                            </div>

                            <div className="lost-modal-body">
                                {/* Thông tin chỉ đọc - không cho sửa tay để tránh phá vỡ state machine */}
                                <div className="lost-form-group">
                                    <label>Mã báo mất</label>
                                    <input type="text" value={editingCard.lost_report_id || editingCard.id || ''} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Mã thẻ</label>
                                    <input type="text" value={editingCard.card_code || editingCard.cardNo || ''} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Biển số xe</label>
                                    <input type="text" value={editingCard.plate_number || editingCard.plate || ''} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Loại thẻ</label>
                                    <input type="text" value={editingCard.card_type || 'Thẻ lượt'} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Nội dung</label>
                                    <input type="text" value={editingCard.description || editingCard.reason || ''} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Người xử lý</label>
                                    <input type="text" value={editingCard.handler_name || '---'} disabled />
                                </div>

                                <div className="lost-form-group">
                                    <label>Phí cấp lại</label>
                                    <input
                                        type="text"
                                        value="50.000 đ"
                                        disabled
                                        style={{
                                            fontWeight: '600',
                                            color: '#b45309',
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a'
                                        }}
                                    />
                                </div>

                                <div className="lost-form-group">
                                    <label>Trạng thái hiện tại</label>
                                    <div>
                                        <span className={`status-badge-lost ${getStatusClass(editingCard.status)}`}>
                                            <span className="dot"></span>
                                            {editingCard.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Khu vực hành động - tùy theo trạng thái hiện tại, chỉ hiện đúng bước tiếp theo hợp lệ */}
                                {editingCard.status === 'Đang chờ' && (
                                    <div className="lost-form-group">
                                        <label>Hành động</label>
                                        <p className="lost-action-hint">
                                            Report đang chờ - bấm "Tiếp nhận xử lý" để bắt đầu xác minh, hoặc "Hủy report" nếu tạo nhầm.
                                        </p>
                                        <input
                                            type="text"
                                            className="lost-action-note-input"
                                            placeholder="Ghi chú (tùy chọn, dùng khi hủy report)..."
                                            value={resolveNote}
                                            onChange={(e) => setResolveNote(e.target.value)}
                                        />
                                        <div className="lost-action-btn-row">
                                            <button
                                                type="button"
                                                className="btn-save"
                                                disabled={actionLoading}
                                                onClick={handleAcceptReport}
                                            >
                                                {actionLoading ? 'Đang xử lý...' : 'Tiếp nhận xử lý'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-cancel btn-cancel-mistake"
                                                disabled={actionLoading}
                                                onClick={handleCancelReport}
                                            >
                                                {actionLoading ? 'Đang xử lý...' : 'Hủy report (tạo nhầm)'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {editingCard.status === 'Đang xử lý' && (
                                    <div className="lost-form-group">
                                        <label>Ghi chú xử lý (tùy chọn)</label>
                                        <input
                                            type="text"
                                            placeholder="Nhập ghi chú khi đóng report..."
                                            value={resolveNote}
                                            onChange={(e) => setResolveNote(e.target.value)}
                                        />
                                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '8px 0' }}>
                                            Chọn kết quả xử lý để đóng report:
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="btn-save"
                                                disabled={actionLoading}
                                                onClick={() => handleResolveReport('Tìm lại thẻ')}
                                            >
                                                {actionLoading ? 'Đang xử lý...' : 'Đã tìm lại thẻ'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-cancel btn-cancel-danger"
                                                disabled={actionLoading}
                                                onClick={() => handleResolveReport('Hủy thẻ')}
                                            >
                                                {actionLoading ? 'Đang xử lý...' : 'Hủy thẻ vĩnh viễn'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {editingCard.status === 'Đã xong' && (
                                    <div className="lost-form-group">
                                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                            Report này đã được đóng, không thể thao tác thêm.
                                        </p>
                                    </div>
                                )}

                                {editingCard.status === 'Đã hủy thẻ' && (
                                    <div className="lost-form-group" style={{ borderTop: '1px solid #e1e1ee', paddingTop: '16px', marginTop: '16px' }}>
                                        {editingCard.card_type === 'Thẻ tháng' ? (
                                            !showReissueForm ? (
                                                <div>
                                                    <p style={{ fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
                                                        Thẻ tháng này đã bị hủy vĩnh viễn. Bạn có muốn tiến hành cấp lại thẻ mới không?
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="btn-save"
                                                        style={{ background: '#0284c7', borderColor: '#0284c7' }}
                                                        onClick={() => setShowReissueForm(true)}
                                                    >
                                                        Tiến hành cấp lại thẻ mới
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {editingCard.pendingPayment && reissuePayMethod === 'vnpay' ? (
                                                        /* ── Panel VNPay đang chờ thanh toán ── */
                                                        <div>
                                                            <div style={{
                                                                background: '#fffbeb', border: '1px solid #fde68a',
                                                                borderRadius: '10px', padding: '16px', marginBottom: '16px'
                                                            }}>
                                                                <p style={{ fontWeight: 600, color: '#b45309', fontSize: '0.9rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>credit_card</span>
                                                                    Đang chờ thanh toán qua VNPay
                                                                </p>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
                                                                    <span style={{ color: '#64748b' }}>Mã giao dịch</span>
                                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{editingCard.pendingPayment.orderCode}</span>
                                                                    <span style={{ color: '#64748b' }}>Số tiền</span>
                                                                    <span style={{ fontWeight: 700, color: '#b45309' }}>50.000 đ</span>
                                                                    <span style={{ color: '#64748b' }}>Mã thẻ mới</span>
                                                                    <span style={{ color: '#1e293b' }}>{newRfidCode}</span>
                                                                    <span style={{ color: '#64748b' }}>Biển số xe</span>
                                                                    <span style={{ fontWeight: 600, color: '#0284c7' }}>{editingCard.plate_number || editingCard.plate || '---'}</span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        flex: 1, padding: '10px', borderRadius: '8px',
                                                                        background: '#f8fafc', border: '1px solid #cbd5e1',
                                                                        color: '#64748b', cursor: 'pointer', fontWeight: 500,
                                                                        fontSize: '0.9rem'
                                                                    }}
                                                                    onClick={() => setEditingCard(null)}
                                                                >
                                                                    Để sau
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        flex: 2, padding: '10px', borderRadius: '8px',
                                                                        background: '#f97316', color: '#fff', border: 'none',
                                                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (editingCard.pendingPayment.payUrl) {
                                                                            window.location.href = editingCard.pendingPayment.payUrl;
                                                                        }
                                                                    }}
                                                                    disabled={!editingCard.pendingPayment.payUrl}
                                                                >
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                                                    Tiếp tục thanh toán VNPay
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : showCashPanel ? (
                                                        /* ── Panel xác nhận thu tiền mặt ── */
                                                        <div>
                                                            <div style={{
                                                                background: '#f0fdf4', border: '1px solid #86efac',
                                                                borderRadius: '10px', padding: '16px', marginBottom: '16px'
                                                            }}>
                                                                <p style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
                                                                    Đang chờ xác nhận thu tiền mặt
                                                                </p>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
                                                                    <span style={{ color: '#64748b' }}>Mã giao dịch</span>
                                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{cashPanelData.orderCode}</span>
                                                                    <span style={{ color: '#64748b' }}>Số tiền</span>
                                                                    <span style={{ fontWeight: 700, color: '#166534' }}>50.000 đ</span>
                                                                    <span style={{ color: '#64748b' }}>Mã thẻ mới</span>
                                                                    <span style={{ color: '#1e293b' }}>{newRfidCode}</span>
                                                                    <span style={{ color: '#64748b' }}>Biển số xe</span>
                                                                    <span style={{ fontWeight: 600, color: '#0284c7' }}>{editingCard.plate_number || editingCard.plate || '---'}</span>
                                                                </div>
                                                            </div>

                                                            {cashConfirmSuccess ? (
                                                                <div style={{
                                                                    background: '#f0fdf4', border: '1px solid #86efac',
                                                                    borderRadius: '8px', padding: '16px', textAlign: 'center',
                                                                    color: '#166534', fontSize: '0.95rem', fontWeight: 600
                                                                }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>check_circle</span>
                                                                    Xác nhận thu tiền mặt thành công!
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                                    <button
                                                                        type="button"
                                                                        style={{
                                                                            flex: 1, padding: '10px', borderRadius: '8px',
                                                                            background: '#f8fafc', border: '1px solid #cbd5e1',
                                                                            color: '#64748b', cursor: 'pointer', fontWeight: 500,
                                                                            fontSize: '0.9rem'
                                                                        }}
                                                                        onClick={() => setEditingCard(null)}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Để sau
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        style={{
                                                                            flex: 2, padding: '10px', borderRadius: '8px',
                                                                            background: '#16a34a', color: '#fff', border: 'none',
                                                                            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                                        }}
                                                                        onClick={handleConfirmReissueCash}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                                                                        Xác nhận đã thu 50.000 đ
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* ── Form nhập RFID + chọn phương thức ── */
                                                        <>
                                                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                                                                Cấp lại RFID cho thẻ tháng
                                                            </h3>
                                                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                                                Mã RFID mới sẽ được ghi đè trực tiếp lên thẻ cũ. Hợp đồng và đăng ký xe giữ nguyên.
                                                            </p>

                                                            <div className="lost-form-group">
                                                                <label>Mã thẻ RFID mới <span style={{ color: '#ef4444' }}>*</span></label>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Nhập hoặc quét mã thẻ RFID mới..."
                                                                        value={newRfidCode}
                                                                        onChange={(e) => setNewRfidCode(e.target.value)}
                                                                        style={{ flex: 1 }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        title="Tự động sinh mã RFID ngẫu nhiên"
                                                                        onClick={() => {
                                                                            const rand = `MONTH${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;
                                                                            setNewRfidCode(rand);
                                                                        }}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                                            padding: '8px 12px', background: '#f1f5f9',
                                                                            border: '1px solid #cbd5e1', borderRadius: '8px',
                                                                            cursor: 'pointer', fontSize: '13px', color: '#475569',
                                                                            whiteSpace: 'nowrap', fontWeight: '500', transition: 'all 0.15s'
                                                                        }}
                                                                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                                                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shuffle</span>
                                                                        Tự động sinh
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Chọn phương thức thanh toán */}
                                                            <div style={{ marginTop: '4px' }}>
                                                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '500' }}>Phương thức thanh toán (Phí 50.000đ)</p>
                                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                                    {/* VNPay */}
                                                                    <label style={{
                                                                        flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                                                                        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                                                        border: `2px solid ${reissuePayMethod === 'vnpay' ? '#2563eb' : '#e2e8f0'}`,
                                                                        background: reissuePayMethod === 'vnpay' ? '#eff6ff' : '#f8fafc',
                                                                        transition: 'all 0.15s', fontSize: '13px'
                                                                    }}>
                                                                        <input type="radio" name="reissuePayMethod" value="vnpay"
                                                                            checked={reissuePayMethod === 'vnpay'}
                                                                            onChange={() => setReissuePayMethod('vnpay')}
                                                                            style={{ accentColor: '#2563eb' }}
                                                                        />
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#2563eb' }}>credit_card</span>
                                                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>VNPay</span>
                                                                    </label>
                                                                    {/* Tiền mặt */}
                                                                    <label style={{
                                                                        flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                                                                        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                                                        border: `2px solid ${reissuePayMethod === 'cash' ? '#16a34a' : '#e2e8f0'}`,
                                                                        background: reissuePayMethod === 'cash' ? '#f0fdf4' : '#f8fafc',
                                                                        transition: 'all 0.15s', fontSize: '13px'
                                                                    }}>
                                                                        <input type="radio" name="reissuePayMethod" value="cash"
                                                                            checked={reissuePayMethod === 'cash'}
                                                                            onChange={() => setReissuePayMethod('cash')}
                                                                            style={{ accentColor: '#16a34a' }}
                                                                        />
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>payments</span>
                                                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>Tiền mặt</span>
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn-save"
                                                                    onClick={() => handleReissueCard(reissuePayMethod)}
                                                                    disabled={actionLoading}
                                                                    style={{
                                                                        background: reissuePayMethod === 'vnpay' ? '#2563eb' : '#16a34a',
                                                                        borderColor: reissuePayMethod === 'vnpay' ? '#2563eb' : '#16a34a'
                                                                    }}
                                                                >
                                                                    {actionLoading ? 'Đang xử lý...' :
                                                                        reissuePayMethod === 'vnpay' ? '💳 Thanh toán VNPay' : '💵 Thanh toán tiền mặt'
                                                                    }
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-cancel"
                                                                    onClick={() => handleReissueCard('defer')}
                                                                    disabled={actionLoading}
                                                                    style={{
                                                                        background: '#f5f3ff', border: '1px solid #c4b5fd',
                                                                        color: '#7c3aed', fontWeight: '500'
                                                                    }}
                                                                >
                                                                    ⏱ Thanh toán sau
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-cancel"
                                                                    onClick={() => setShowReissueForm(false)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    Hủy
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                                Thẻ bị hủy là thẻ lượt, không áp dụng quy trình cấp lại thẻ tháng.
                                            </p>
                                        )}
                                    </div>
                                )}

                            </div>

                            <div className="lost-modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setEditingCard(null)}
                                    disabled={actionLoading}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showCreateModal && (
                    <div className="lost-modal-overlay">
                        <div className="lost-modal">
                            <div className="lost-modal-header">
                                <h2>Tạo báo mất mới</h2>
                            </div>
                            <div className="lost-modal-body">
                                <div className="lost-form-group">
                                    <label>Biển số xe <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Nhập biển số xe..."
                                        value={newLostCard.plate_number}
                                        onChange={(e) =>
                                            setNewLostCard({
                                                ...newLostCard,
                                                plate_number: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="lost-form-group">
                                    <label>Lí do <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Nhập lí do báo mất..."
                                        value={newLostCard.description}
                                        onChange={(e) =>
                                            setNewLostCard({
                                                ...newLostCard,
                                                description: e.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="lost-modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Hủy</button>
                                <button type="button" className="btn-save" onClick={handleCreateLostCard}>Lưu</button>
                            </div>
                        </div>
                    </div>
                )}
                {showHistoryModal && (
                    <div className="lost-modal-overlay">
                        <div className="lost-modal history-modal-wide">
                            <div className="history-modal-header">
                                <div className="history-modal-header-left">
                                    <span className="material-symbols-outlined">manage_history</span>
                                    <h2>Lịch sử xử lý</h2>
                                </div>
                                <div className="history-modal-header-right">
                                    <div className="history-search-container">
                                        <span className="material-symbols-outlined">search</span>
                                        <input
                                            type="text"
                                            className="history-search-input"
                                            placeholder="Tìm kiếm thẻ hoặc biển số..."
                                            value={historySearch}
                                            onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                                        />
                                    </div>
                                    <button className="history-close-btn" onClick={() => setShowHistoryModal(false)} title="Đóng">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>

                            <div className="history-modal-body">
                                {historyLoading ? (
                                    <div className="history-empty-container">
                                        <span className="material-symbols-outlined">sync</span>
                                        <p>Đang tải lịch sử...</p>
                                    </div>
                                ) : (() => {
                                    const filtered = historyData.filter(item => {
                                        const s = historySearch.toLowerCase();
                                        return (item.card_code || '').toLowerCase().includes(s) ||
                                            (item.plate_number || '').toLowerCase().includes(s) ||
                                            (item.note || '').toLowerCase().includes(s);
                                    });
                                    const totalPages = Math.ceil(filtered.length / historyItemsPerPage) || 1;
                                    const paginated = filtered.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage);

                                    let startPage = Math.max(1, historyPage - 1);
                                    let endPage = Math.min(totalPages, historyPage + 1);
                                    if (totalPages > 3) {
                                        if (historyPage === 1) {
                                            endPage = 3;
                                        } else if (historyPage === totalPages) {
                                            startPage = totalPages - 2;
                                        }
                                    } else {
                                        startPage = 1;
                                        endPage = totalPages;
                                    }
                                    const pageNumbers = [];
                                    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

                                    return (
                                        <>
                                            <div className="history-list-scroll">
                                                {paginated.length === 0 ? (
                                                    <div className="history-empty-container">
                                                        <span className="material-symbols-outlined">history_toggle_off</span>
                                                        <p>Không tìm thấy dữ liệu lịch sử phù hợp.</p>
                                                    </div>
                                                ) : (
                                                    paginated.map((item) => {
                                                        let colorClass = '#94a3b8';
                                                        const actionLower = (item.action || '').toLowerCase();
                                                        if (actionLower.includes('mở khóa') || actionLower.includes('tìm lại')) {
                                                            colorClass = '#10b981';
                                                        } else if (actionLower.includes('khóa') || actionLower.includes('vô hiệu')) {
                                                            colorClass = '#f59e0b';
                                                        } else if (actionLower.includes('xóa') || actionLower.includes('hủy')) {
                                                            colorClass = '#ef4444';
                                                        } else if (actionLower.includes('cấp lại') || actionLower.includes('hoàn thành')) {
                                                            colorClass = '#3b82f6';
                                                        }

                                                        let noteText = item.note || 'Không có ghi chú';
                                                        noteText = noteText.replace(/ - /g, '\n• ');

                                                        return (
                                                            <div key={item.log_id} className="history-card" style={{ borderLeftColor: colorClass }}>
                                                                <div className="history-card-header">
                                                                    <div className="history-action-badge">
                                                                        <span style={{ color: colorClass }}>{item.action} —</span>
                                                                        <span style={{ color: '#475569' }}>Thẻ {item.card_code} ({item.plate_number || '---'})</span>
                                                                    </div>
                                                                    <div className="history-card-time">
                                                                        <span>{new Date(item.performed_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                                                                        <span className="history-card-sub" style={{ marginLeft: '6px' }}>
                                                                            <i>bởi {item.performed_by_name}</i>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="history-card-note">
                                                                    <div style={{ fontWeight: '600', color: '#475569', marginBottom: '2px', fontSize: '12px' }}>Ghi chú:</div>
                                                                    <div>{noteText}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <div className="history-modal-footer">
                                                <div className="history-pagination">
                                                    <button className="history-page-btn" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                                    </button>
                                                    {pageNumbers.map(p => (
                                                        <button key={p} className={`history-page-btn ${historyPage === p ? 'active' : ''}`} onClick={() => setHistoryPage(p)}>{p}</button>
                                                    ))}
                                                    <button className="history-page-btn" disabled={historyPage === totalPages} onClick={() => setHistoryPage(p => p + 1)}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );

}