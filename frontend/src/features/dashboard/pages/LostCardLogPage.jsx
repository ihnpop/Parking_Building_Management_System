import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createLostCard } from "../../../service/cardApi";
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
export default function LostCardLogPage({ showBackButton = false }) {
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const { user } = useAuth();
    // Lấy tên hiển thị: ưu tiên full_name → name → email
    const currentUserName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email
        || '---';
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

<<<<<<< HEAD
=======
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // States dùng cho bộ lọc
>>>>>>> origin/OperationLog_UXUI
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    // Xử lý gửi yêu cầu tạo báo mất thẻ mới lên server
    const [historyData, setHistoryData] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
    const historyItemsPerPage = 5;

    // States và Effect cho chức năng Cấp lại thẻ tháng bị mất
    const [showReissueForm, setShowReissueForm] = useState(false);
    const [newRfidCode, setNewRfidCode] = useState('');
    const [reissueStartDate, setReissueStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        // Reset form cấp lại thẻ khi đóng modal hoặc đổi thẻ đang xem
        setShowReissueForm(false);
        setNewRfidCode('');
        setReissueStartDate(new Date().toISOString().split('T')[0]);
    }, [editingCard]);

    const handleReissueCard = async () => {
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
                    reportId: editingCard.raw_report_id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast('Đã cấp lại thẻ RFID thành công!', 'success');

            // res.data.data.payUrl theo shape { success, data: { card, payUrl, ... } }
            const payUrl = res.data?.data?.payUrl;
            if (payUrl) {
                window.location.href = payUrl;
            }

            setEditingCard(null);
            await fetchLostCards();
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể cấp lại thẻ';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewHistory = async () => {
        try {
            setHistoryLoading(true);
            setShowHistoryModal(true);
            setHistorySearchTerm('');
            setHistoryCurrentPage(1);
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

            // Gọi trực tiếp tới endpoint Backend của bạn
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
        let filtered = lostCards.filter((row) => {
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

            let matchesDate = true;
            if (startDate || endDate) {
                const rowDateStr = row.reported_at || row.date;
                if (rowDateStr) {
                    const rowDate = new Date(rowDateStr);
                    if (!isNaN(rowDate.getTime())) {
                        rowDate.setHours(0, 0, 0, 0);

                        if (startDate) {
                            const sDate = new Date(startDate);
                            sDate.setHours(0, 0, 0, 0);
                            if (rowDate < sDate) matchesDate = false;
                        }
                        if (endDate) {
                            const eDate = new Date(endDate);
                            eDate.setHours(23, 59, 59, 999);
                            if (rowDate > eDate) matchesDate = false;
                        }
                    }
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
        setFilteredCards(filtered);
        setCurrentPage(1);
    };

    useEffect(() => {
        handleFilter();
    }, [statusFilter, search, lostCards, startDate, endDate]);

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

    // Chỉ định class màu CSS riêng biệt cho 3 trạng thái khác nhau
    // const getStatusClass = (status) => {
    //     if (status === 'Chờ xử lý' || status === 'PENDING') return 'status-pending'; // Màu vàng/cam cảnh báo
    //     if (status === 'Đang xử lý') return 'status-processing' || 'status-pending'; // Bạn có thể định nghĩa màu xanh dương trong CSS, hoặc dùng tạm màu vàng cam
    //     if (status === 'Đã xong' || status === 'RESOLVED') return 'status-recovered'; // Màu xanh lá hoàn thành
    //     return '';
    // };  

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

    // Tính toán số liệu thống kê động chia đều cho 3 trạng thái
    const totalLost = lostCards.length;
    const pendingCount = lostCards.filter(c => c.status === 'Đang chờ').length;
    const processingCount = lostCards.filter(c => c.status === 'Đang xử lý').length;
<<<<<<< HEAD
    const resolvedCount = lostCards.filter(c => c.status === 'Đã xong' || c.status === 'RESOLVED').length;
=======
    const resolvedCount = lostCards.filter(c => c.status === 'Đã xong' || c.status === 'Đã tìm lại' || c.status === 'Đã xử lý').length;
    const cancelledCount = lostCards.filter(c => c.status === 'Đã hủy thẻ').length;
    const cancelledMistakeCount = lostCards.filter(c => c.status === 'Đã hủy (tạo nhầm)').length;

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
>>>>>>> origin/OperationLog_UXUI

    return (
        <section className="stats-dashboard-page">
            {/* Top Navigation Header - chỉ hiển thị khi truy cập qua route riêng */}
            {showBackButton && (
                <header className="stats-top-bar">
                    <button className="stats-back-btn" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Thoát
                    </button>
                    <span className="stats-top-bar-title">Nhật ký mất thẻ</span>
                </header>
            )}

            <div className="lost-card-log-wrapper">
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
                            <div className="lost-kpi-value">{cancelledMistakeCount}</div>
                            <div className="lost-kpi-footer txt-gray">Đã hủy báo cáo</div>
                        </div>
                    </div>
                </div>

<<<<<<< HEAD
                {/* Filters Toolbar */}
                <div className="lost-filter-card">
                    <div className="filter-block">
                        <label className="filter-label">Tìm kiếm nâng cao</label>
                        <div className="filter-input-wrapper">
                            <span className="material-symbols-outlined icon-left">search</span>
=======
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
                            <span><span className="lost-dist-val">{cancelledMistakeCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((cancelledMistakeCount / totalLost) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-gray" style={{ width: `${totalLost > 0 ? (cancelledMistakeCount / totalLost) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="lost-filter-card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                <div className="filter-block" style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <label className="filter-label">Tìm kiếm nâng cao</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Nhập mã, thẻ, biển số..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-block" style={{ flex: '0 0 160px' }}>
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

                <div className="filter-block" style={{ flex: '0 0 250px' }}>
                    <label className="filter-label">Khoảng ngày báo mất</label>
                    <div className="filter-input-wrapper">
                        <div className="filter-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
>>>>>>> origin/OperationLog_UXUI
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
                            </select>
                            <span className="material-symbols-outlined icon-right">expand_more</span>
                        </div>
                    </div>

                    <div className="filter-block">
                        <label className="filter-label">Khoảng ngày báo mất</label>
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
                </div>
<<<<<<< HEAD

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
=======

                <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto', marginLeft: 'auto' }}>
                    <button type="button" className="page-btn" title="Xem lịch sử xử lý" onClick={handleViewHistory} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', cursor: 'pointer', color: '#334155', flexShrink: 0 }}>
                        <span className="material-symbols-outlined">history</span>
                    </button>
                    <button type="button" className="lost-create-button" onClick={() => setShowCreateModal(true)} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                        Tạo báo mất
                    </button>
                </div>
            </div>

            {/* Table */}
            <section className="lost-table-card">
                {error && (
                    <div className="table-status-error">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="table-status-loading">
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
                                    <th className="text-center">THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((row) => {
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
                                                <td>
                                                    {reportDate && !isNaN(Date.parse(reportDate))
                                                        ? new Date(reportDate).toLocaleString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })
                                                        : reportDate}
                                                </td>
                                                <td className="lost-content-cell" title={content}>{content}</td>
                                                <td>
                                                    <span className={`status-badge-lost ${getStatusClass(row.status)}`}>
                                                        <span className="dot"></span>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td>{row.handler_name || '---'}</td>
                                                <td className="text-center">
                                                    <button type="button" className="lost-action-btn" onClick={() => { setEditingCard(row); setResolveNote(''); }}>
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="table-status-empty">
                                            Không tìm thấy dữ liệu phù hợp
                                        </td>
>>>>>>> origin/OperationLog_UXUI
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCards.length > 0 ? (
                                        filteredCards.map((row) => {
                                            const reportId = row.lost_report_id || row.id;
                                            const cardCode = row.card_code || row.cardNo;
                                            const plateNumber = row.plate_number || row.plate;
                                            const cardType = row.card_type || 'Thẻ lượt';
                                            const reportDate = row.reported_at || row.date;
                                            const content = row.description || row.reason || '---';

<<<<<<< HEAD
                                            return (
                                                <tr key={reportId}>
                                                    <td className="lost-id-cell">{reportId}</td>
                                                    <td>{cardCode}</td>
                                                    <td>{renderPlate(plateNumber)}</td>
                                                    <td>{cardType}</td>
                                                    <td>
                                                        {reportDate && !isNaN(Date.parse(reportDate))
                                                            ? new Date(reportDate).toLocaleString('vi-VN', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric'
                                                            })
                                                            : reportDate}
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
                                <span className="footer-info">Hiển thị {filteredCards.length} của {totalLost} báo cáo</span>
                                <div className="footer-right-actions">
                                    <div className="lost-pagination">
                                        <button type="button" className="page-btn" disabled>
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <button type="button" className="page-btn active">1</button>
                                        <button type="button" className="page-btn" disabled>
                                            <span className="material-symbols-outlined">chevron_right</span>
=======
                        {/* Footer */}
                        <div className="lost-table-footer">
                            <span className="footer-info">Hiển thị {Math.min(startIndex + 1, filteredCards.length)} - {Math.min(startIndex + itemsPerPage, filteredCards.length)} của {filteredCards.length} báo cáo</span>
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
>>>>>>> origin/OperationLog_UXUI
                                        </button>
                                    </div>
                                    <button type="button" className="page-btn" title="Xem lịch sử xử lý" onClick={handleViewHistory}>
                                        <span className="material-symbols-outlined">history</span>
                                    </button>
                                    <button type="button" className="lost-create-button" onClick={() => setShowCreateModal(true)}>
                                        <span className="material-symbols-outlined">add</span>
                                        Tạo báo mất
                                    </button>
                                </div>
<<<<<<< HEAD
                            </div>
                        </>
                    )}
                </section>\n    );\n}\n
=======
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
                                                    Cấp lại thẻ mới (Phí 50.000đ)
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '8px 12px',
                                                                background: '#f1f5f9',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                color: '#475569',
                                                                whiteSpace: 'nowrap',
                                                                fontWeight: '500',
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shuffle</span>
                                                            Tự động sinh
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-save"
                                                        onClick={handleReissueCard}
                                                        disabled={actionLoading}
                                                    >
                                                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận cấp lại & Thanh toán'}
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
                        <div className="lost-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                            <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>Lịch sử xử lý</h2>

                            <input
                                type="text"
                                placeholder="Tìm kiếm thẻ hoặc biển số..."
                                value={historySearchTerm}
                                onChange={(e) => {
                                    setHistorySearchTerm(e.target.value);
                                    setHistoryCurrentPage(1);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    maxWidth: '300px',
                                    marginLeft: 'auto'
                                }}
                            />

                            <button
                                onClick={() => setShowHistoryModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.25rem',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    transition: 'color 0.2s',
                                    padding: '4px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.target.style.color = '#64748b'}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="lost-modal-body" style={{ minHeight: '300px' }}>
                            {(() => {
                                if (historyLoading) return <p className="history-empty">Đang tải...</p>;

                                const searchLower = historySearchTerm.toLowerCase();
                                const filteredHistory = historyData.filter(item => {
                                    return (item.card_code || '').toLowerCase().includes(searchLower) ||
                                        (item.plate_number || '').toLowerCase().includes(searchLower);
                                });

                                if (filteredHistory.length === 0) return <p className="history-empty">Chưa có lịch sử hoạt động nào.</p>;

                                const paginatedHistory = filteredHistory.slice(
                                    (historyCurrentPage - 1) * historyItemsPerPage,
                                    historyCurrentPage * historyItemsPerPage
                                );

                                return (
                                    <div className="history-list">
                                        {paginatedHistory.map((item) => {
                                            let borderColor = '#cbd5e1';
                                            const act = (item.action || '').toLowerCase();
                                            if (act.includes('khóa')) borderColor = '#f59e0b'; // orange
                                            else if (act.includes('cấp lại')) borderColor = '#3b82f6'; // blue
                                            else if (act.includes('xóa') || act.includes('hủy')) borderColor = '#ef4444'; // red
                                            else if (act.includes('tạo') || act.includes('mở')) borderColor = '#10b981'; // green

                                            return (
                                                <div key={item.log_id} className="history-item" style={{ borderLeft: `4px solid ${borderColor}` }}>
                                                    <div className="history-action">
                                                        <span style={{ color: borderColor !== '#cbd5e1' ? borderColor : 'inherit' }}>{item.action}</span> — <span className="history-target">Thẻ {item.card_code} ({item.plate_number || '---'})</span>
                                                    </div>
                                                    <div className="history-meta">
                                                        <span className="history-meta-time">{new Date(item.performed_at).toLocaleString('vi-VN')}</span>
                                                        <span className="history-meta-user">bởi {item.performed_by_name}</span>
                                                    </div>
                                                    {item.note && (
                                                        <div className="history-note" style={{ whiteSpace: 'pre-line' }}>
                                                            <span className="note-label" style={{ display: 'block', marginBottom: '4px' }}>Ghi chú:</span>
                                                            {item.note.replace(/ - /g, '\n• ').replace(/\. (?=[A-Z])/g, '.\n')}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="lost-modal-actions" style={{ justifyContent: 'flex-end', display: 'flex', padding: '12px 24px' }}>
                            {(() => {
                                const searchLower = historySearchTerm.toLowerCase();
                                const filteredHistory = historyData.filter(item => {
                                    return (item.card_code || '').toLowerCase().includes(searchLower) ||
                                        (item.plate_number || '').toLowerCase().includes(searchLower);
                                });
                                const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;

                                if (totalPages <= 1) return null;

                                return (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            disabled={historyCurrentPage === 1}
                                            onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                padding: 0,
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                background: 'white',
                                                color: historyCurrentPage === 1 ? '#94a3b8' : '#334155',
                                                cursor: historyCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={(e) => {
                                                if (historyCurrentPage !== 1) e.currentTarget.style.background = '#f1f5f9';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (historyCurrentPage !== 1) e.currentTarget.style.background = 'white';
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                        </button>

                                        {(() => {
                                            let startPage = Math.max(1, historyCurrentPage - 1);
                                            let endPage = Math.min(totalPages, historyCurrentPage + 1);

                                            if (historyCurrentPage === 1) {
                                                endPage = Math.min(totalPages, 3);
                                            } else if (historyCurrentPage === totalPages) {
                                                startPage = Math.max(1, totalPages - 2);
                                            }

                                            const pagesToShow = [];
                                            for (let i = startPage; i <= endPage; i++) {
                                                pagesToShow.push(i);
                                            }

                                            return pagesToShow.map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setHistoryCurrentPage(page)}
                                                    style={{
                                                        minWidth: '32px',
                                                        height: '32px',
                                                        padding: '0 8px',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '4px',
                                                        background: historyCurrentPage === page ? '#3b82f6' : 'white',
                                                        color: historyCurrentPage === page ? 'white' : '#334155',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (historyCurrentPage !== page) e.currentTarget.style.background = '#f1f5f9';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (historyCurrentPage !== page) e.currentTarget.style.background = 'white';
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            ));
                                        })()}

                                        <button
                                            disabled={historyCurrentPage === totalPages}
                                            onClick={() => setHistoryCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                padding: 0,
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                background: 'white',
                                                color: historyCurrentPage === totalPages ? '#94a3b8' : '#334155',
                                                cursor: historyCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={(e) => {
                                                if (historyCurrentPage !== totalPages) e.currentTarget.style.background = '#f1f5f9';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (historyCurrentPage !== totalPages) e.currentTarget.style.background = 'white';
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
>>>>>>> origin/OperationLog_UXUI
