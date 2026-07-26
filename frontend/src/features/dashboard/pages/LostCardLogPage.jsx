import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    getLostCards,
    checkLostCardPlate,
    createLostCard,
    updateLostCard,
    acceptLostCard,
    cancelLostCard,
    resolveLostCard,
    reissueCard,
    confirmReissueCash,
    initiateLostTurnCardPayment,
    confirmLostTurnCardCash,
    getLostCardHistory,
    getCards,
    getMonthCards
} from "../../../service/cardApi";
import { getCasualCardSessions } from "../../../service/casualCardApi";
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

    // Trạng thái hiển thị modal tạo báo mất thẻ & modal xác nhận hủy thẻ
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [resolveNote, setResolveNote] = useState('');

    // Dữ liệu nhập vào của form báo mất thẻ mới
    const [newLostCard, setNewLostCard] = useState({
        plate_number: '',
        description: ''
    });

    // ── State bổ sung cho Quy trình Báo Mất Thẻ chuẩn 6 bước mới ──
    const [createCardCategory, setCreateCardCategory] = useState('casual'); // 'casual' | 'month'
    const [wizardStep, setWizardStep] = useState(1); // 1: Check, 2: Info, 3: Accept & Cancel, 4: Pay, 5: Done & Next Flow
    const [checkPlateInput, setCheckPlateInput] = useState('');
    const [cardCheckData, setCardCheckData] = useState(null);
    const [cardChecking, setCardChecking] = useState(false);
    const [stepError, setStepError] = useState(null);
    const [cavetImage, setCavetImage] = useState(null);
    const [cavetPreviewUrl, setCavetPreviewUrl] = useState(null);
    const [cccdImage, setCccdImage] = useState(null);
    const [cccdPreviewUrl, setCccdPreviewUrl] = useState(null);
    const [cccdNumber, setCccdNumber] = useState('');
    const [cccdVerified, setCccdVerified] = useState(false);
    const [createLostReason, setCreateLostReason] = useState('');
    const [cardCancelled, setCardCancelled] = useState(false);
    const [createPaymentMethod, setCreatePaymentMethod] = useState('cash'); // 'cash' | 'vnpay'
    const [paymentDone, setPaymentDone] = useState(false);
    const [reissueRfidInput, setReissueRfidInput] = useState('');
    const [currentDraftId, setCurrentDraftId] = useState(null);

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
    const [availableCards, setAvailableCards] = useState([]);
    const [loadingAvailableCards, setLoadingAvailableCards] = useState(false);

    useEffect(() => {
        if (showReissueForm || (showCreateModal && wizardStep >= 4 && createCardCategory === 'month')) {
            const fetchAvail = async () => {
                try {
                    setLoadingAvailableCards(true);
                    const cards = await getMonthCards();
                    const blankCards = cards.filter(c => {
                        if (!c.status) return false;
                        const s = c.status.toLowerCase().trim();
                        return s.includes('chờ') || s.includes('blank') || s.includes('available');
                    });
                    setAvailableCards(blankCards);
                    if (blankCards.length > 0) {
                        if (showReissueForm && !newRfidCode) {
                            setNewRfidCode(blankCards[0].code || blankCards[0].cardNo);
                        }
                        if (showCreateModal && !reissueRfidInput) {
                            setReissueRfidInput(blankCards[0].code || blankCards[0].cardNo);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching available cards:", err);
                } finally {
                    setLoadingAvailableCards(false);
                }
            };
            fetchAvail();
        }
    }, [showReissueForm, showCreateModal, wizardStep, createCardCategory, newRfidCode, reissueRfidInput]);

    // State theo dõi Popover fixed đè trên cùng hiển thị mã báo mất đầy đủ
    const [popoverState, setPopoverState] = useState(null); // { id, fullId, x, y }

    useEffect(() => {
        const handleClose = () => setPopoverState(null);
        window.addEventListener('click', handleClose);
        window.addEventListener('scroll', handleClose, true);
        return () => {
            window.removeEventListener('click', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, []);

    // Lắng nghe phản hồi trả về từ cổng VNPay Sandbox (giống hệt luồng Gia hạn thẻ tháng)
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const vnpResponseCode = queryParams.get('vnp_ResponseCode');
        const vnpTransactionStatus = queryParams.get('vnp_TransactionStatus');

        if (vnpResponseCode === '00' || vnpTransactionStatus === '00') {
            showToast('Thanh toán VNPay thành công! Đơn báo mất đã chuyển sang trạng thái Đã xong.', 'success');
            fetchLostCards();
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (vnpResponseCode && vnpResponseCode !== '00') {
            showToast('Giao dịch VNPay không thành công hoặc đã hủy!', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

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
            setShowReissueForm(false);
            setNewRfidCode('');
            setReissueStartDate(new Date().toISOString().split('T')[0]);
            setReissuePayMethod('vnpay');
            setShowCashPanel(false);
            setCashPanelData({ orderCode: '', amount: 50000 });
            setCashConfirmSuccess(false);
        }
    }, [editingCard]);

    // ── Helper kiểm tra thông tin thẻ khi bấm "Kiểm tra" trong form báo mất mới (Gọi API Backend thực tế) ──
    const handleCheckCardInfo = async () => {
        if (!checkPlateInput.trim()) {
            setStepError("Vui lòng nhập biển số xe.");
            showToast("Vui lòng nhập biển số xe.", "error");
            return;
        }

        setCardChecking(true);
        setCardCheckData(null);
        setStepError(null);

        try {
            const checkData = await checkLostCardPlate({
                plate_number: checkPlateInput.trim(),
                card_category: createCardCategory
            });

            setCardCheckData(checkData);
            setCreateCardCategory(checkData.cardType === 'Thẻ tháng' ? 'month' : 'casual');

            // Khóa thẻ ngay lập tức và tạo bản ghi báo mất trong DB khi chuyển sang Bước 2
            const createRes = await createLostCard({
                plate_number: checkPlateInput.trim(),
                description: 'Khởi tạo báo mất thẻ'
            });

            const rawReportId = createRes.lost_report_id || createRes.data?.lost_report_id || createRes.id;
            setCurrentDraftId(rawReportId);

            setWizardStep(2); // Chuyển sang Bước 2 khi thành công
            showToast(`Xác minh thành công [${checkData.cardType}] & Đã khóa thẻ trên hệ thống!`, 'success');
            await fetchLostCards();
        } catch (err) {
            console.error('[handleCheckCardInfo] Lỗi kiểm tra:', err);
            const msg = err.response?.data?.message || err.message || 'Không thể kiểm tra thông tin biển số xe.';
            setStepError(msg);
            showToast(msg, 'error');
        } finally {
            setCardChecking(false);
        }
    };

    const resetCreateModalState = () => {
        setCreateCardCategory('casual');
        setWizardStep(1);
        setCheckPlateInput('');
        setCardCheckData(null);
        setCardChecking(false);
        setStepError(null);
        setCavetImage(null);
        setCavetPreviewUrl(null);
        setCccdImage(null);
        setCccdPreviewUrl(null);
        setCccdNumber('');
        setCccdVerified(false);
        setCreateLostReason('');
        setCardCancelled(false);
        setCreatePaymentMethod('cash');
        setPaymentDone(false);
        setReissueRfidInput('');
        setNewLostCard({ plate_number: '', description: '' });
        setCurrentDraftId(null);
    };

    // ── Nút "Xử lý sau": Lưu toàn bộ thông tin đã nhập & trạng thái hiện tại xuống Backend ──
    const handleProcessLater = async () => {
        const plate = checkPlateInput.trim() || newLostCard.plate_number.trim();
        try {
            setActionLoading(true);
            let reportIdToUse = currentDraftId;

            if (!reportIdToUse && plate) {
                const createRes = await createLostCard({
                    plate_number: plate,
                    description: createLostReason || 'Khởi tạo báo mất thẻ'
                });
                reportIdToUse = createRes.lost_report_id || createRes.data?.lost_report_id || createRes.id;
                setCurrentDraftId(reportIdToUse);
            }

            if (reportIdToUse) {
                // Cập nhật thông tin lý do và ảnh hiện có xuống Backend CSDL nếu có
                const updatePayload = {};
                if (createLostReason) updatePayload.description = createLostReason;
                if (cavetPreviewUrl) updatePayload.vehicle_registration_image_url = cavetPreviewUrl;
                if (cccdPreviewUrl) updatePayload.id_card_image_url = cccdPreviewUrl;

                if (Object.keys(updatePayload).length > 0) {
                    await updateLostCard(reportIdToUse, updatePayload);
                }

                if (wizardStep >= 3 && !cardCancelled) {
                    try {
                        await acceptLostCard(reportIdToUse);
                    } catch (e) {
                        // Da tiep nhan truoc đó
                    }
                }
            }

            await fetchLostCards();
            showToast('Đã lưu toàn bộ thông tin xử lý xuống Backend CSDL.', 'info');
            setShowCreateModal(false);
            resetCreateModalState();
        } catch (err) {
            console.error('Lỗi khi lưu nháp xuống Backend:', err);
            const msg = err.response?.data?.message || err.message || 'Không thể lưu dữ liệu xuống Backend.';
            showToast(msg, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Tiếp tục xử lý từ Nhật ký mất thẻ (Khôi phục dữ liệu từ Backend) ──
    const handleResumeReport = (row) => {
        const curStatus = row._backendStatus || row.status || 'Đang chờ';

        // Đơn đã Hoàn thành, Đã xong hoặc Đã hủy (tạo nhầm) -> Chỉ cho phép xem chi tiết, không tiếp tục workflow
        if (
            curStatus === 'Hoàn thành' ||
            curStatus === 'Đã xong' ||
            curStatus === 'Đã hủy (tạo nhầm)' ||
            curStatus === 'Đã hủy' ||
            curStatus.toLowerCase().includes('hủy') ||
            curStatus.toLowerCase().includes('nhầm')
        ) {
            if (curStatus !== 'Đã hủy thẻ') {
                setEditingCard(row);
                setResolveNote('');
                return;
            }
        }

        const reportId = row.raw_report_id || row.lost_report_id || row.id;
        const cat = row.card_type === 'Thẻ tháng' ? 'month' : 'casual';
        const plate = row.plate_number || row.plate || '';
        const reason = row.description || row.reason || '';
        const actualParkingFee = row.parking_fee ?? row.parkingFee ?? row.estimated_fee ?? 0;

        setCreateCardCategory(cat);
        setCheckPlateInput(plate);
        setCreateLostReason(reason);
        setCccdNumber(row.cccd_number || '');
        setCccdVerified(false);
        setCccdPreviewUrl(row.id_card_image_url || null);
        setCavetPreviewUrl(row.vehicle_registration_image_url || null);
        setCurrentDraftId(reportId);

        setCardCheckData({
            exists: true,
            active: true,
            cardId: row.card_id,
            cardCode: row.card_code || row.cardNo || '---',
            cardType: row.card_type || (cat === 'month' ? 'Thẻ tháng' : 'Thẻ lượt'),
            ownerName: row.customer_name || row.owner || (cat === 'month' ? 'Chủ thẻ tháng' : 'Khách vãng lai'),
            package: cat === 'month' ? 'Gói vé tháng' : 'Vé gửi theo lượt/ca',
            parkingFee: cat === 'casual' ? actualParkingFee : 0,
            lostFee: 50000,
            totalFee: cat === 'casual' ? actualParkingFee + 50000 : 50000
        });

        // Dùng _backendStatus (status gốc từ Backend) để xác định đúng bước resume
        let stepToResume = 1;
        let isCardCancel = false;

        if (curStatus === 'Đã hủy thẻ' || curStatus === 'Chờ thanh toán') {
            stepToResume = 4;
            isCardCancel = true;
            if (row.pendingPayment) {
                setCreatePaymentMethod(row.pendingPayment.paymentMethod === 'cash' ? 'cash' : 'vnpay');
                setReissueRfidInput(row.pendingPayment.newCode || '');
                setNewRfidCode(row.pendingPayment.newCode || '');
                if (row.pendingPayment.paymentMethod === 'cash') {
                    setShowCashPanel(true);
                    setCashPanelData({
                        orderCode: row.pendingPayment.orderCode,
                        amount: row.pendingPayment.amount
                    });
                }
            }
        } else if (curStatus === 'Đang xử lý') {
            stepToResume = 3;
        } else if (curStatus === 'Đang chờ' || plate) {
            stepToResume = 2;
        }

        setCardCancelled(isCardCancel);
        setWizardStep(stepToResume);
        setShowCreateModal(true);
        showToast(`Tiếp tục xử lý báo mất [${plate.toUpperCase()}] từ Bước ${stepToResume} (${curStatus})`, 'info');
    };

    const handleCavetImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCavetImage(file);
            setCavetPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCccdImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCccdImage(file);
            setCccdPreviewUrl(URL.createObjectURL(file));
        }
    };



    const handleConfirmCancelCard = () => {
        setShowCancelConfirmDialog(true);
    };

    const isUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const handleAcceptAndCreateReport = async () => {
        const plate = checkPlateInput.trim();
        const reason = createLostReason.trim();

        if (!plate) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }

        if (!reason) {
            showToast('Vui lòng nhập lý do báo mất thẻ.', 'error');
            return;
        }

        if (createCardCategory === 'casual' && !cavetPreviewUrl) {
            showToast('Vui lòng tải lên ảnh Cà vẹt xe.', 'error');
            return;
        }

        if (createCardCategory === 'month' && !cccdPreviewUrl) {
            showToast('Vui lòng tải lên ảnh CCCD.', 'error');
            return;
        }

        try {
            setActionLoading(true);
            let reportIdToUse = currentDraftId;

            if (!isUUID(reportIdToUse)) {
                const createRes = await createLostCard({ plate_number: plate, description: reason });
                reportIdToUse = createRes.lost_report_id || createRes.data?.lost_report_id || createRes.id;
                setCurrentDraftId(reportIdToUse);
            } else {
                // 1. Cập nhật thông tin lý do & hình ảnh đã nhập từ bước 2
                try {
                    await updateLostCard(reportIdToUse, {
                        description: reason,
                        vehicle_registration_image_url: cavetPreviewUrl || undefined,
                        id_card_image_url: cccdPreviewUrl || undefined
                    });
                } catch (updateErr) {
                    console.warn('Lỗi cập nhật thông tin (có thể report đã qua bước này):', updateErr.message);
                }

                // 2. Chuyển report sang trạng thái 'Đang xử lý'
                // Nếu report đã ở trạng thái cao hơn (Đang xử lý, Đã hủy thẻ), Backend sẽ từ chối
                // -> bắt lỗi và nhảy tới bước đúng thay vì báo lỗi cho người dùng
                try {
                    await acceptLostCard(reportIdToUse);
                } catch (acceptErr) {
                    const errMsg = acceptErr.response?.data?.message || '';
                    // Nếu report đã ở trạng thái cao hơn 'Đang chờ' -> bỏ qua lỗi, chuyển sang bước phù hợp
                    if (errMsg.includes('Đang xử lý')) {
                        setWizardStep(3);
                        showToast('Report đã được tiếp nhận trước đó. Chuyển sang bước Hủy thẻ.', 'info');
                        await fetchLostCards();
                        return;
                    } else if (errMsg.includes('Đã hủy thẻ') || errMsg.includes('Chờ thanh toán')) {
                        setCardCancelled(true);
                        setWizardStep(4);
                        showToast('Report đã khóa thẻ rồi. Chuyển sang bước Thanh toán.', 'info');
                        await fetchLostCards();
                        return;
                    } else if (errMsg.includes('Đã xong') || errMsg.includes('Hoàn thành')) {
                        setPaymentDone(true);
                        setWizardStep(5);
                        showToast('Report đã hoàn tất trước đó.', 'info');
                        await fetchLostCards();
                        return;
                    }
                    throw acceptErr; // Lỗi khác -> throw tiếp
                }
            }

            setWizardStep(3);
            showToast('Đã tiếp nhận báo mất thành công!', 'success');
            await fetchLostCards();
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể tiếp nhận báo cáo mất thẻ';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const executeCancelCard = async () => {
        setShowCancelConfirmDialog(false);
        let reportIdToUse = currentDraftId;

        if (!isUUID(reportIdToUse)) {
            const plate = checkPlateInput.trim() || newLostCard.plate_number.trim();
            if (!plate) {
                showToast('Không tìm thấy thông tin biển số xe để khởi tạo báo cáo.', 'error');
                return;
            }
            try {
                setActionLoading(true);
                const createRes = await createLostCard({ plate_number: plate, description: createLostReason || 'Khởi tạo báo mất thẻ' });
                reportIdToUse = createRes.lost_report_id || createRes.data?.lost_report_id || createRes.id;
                setCurrentDraftId(reportIdToUse);
            } catch (err) {
                console.error('Lỗi khi khởi tạo báo mất trong CSDL:', err);
                const message = err.response?.data?.message || err.message || 'Không thể hủy thẻ vĩnh viễn';
                showToast(message, 'error');
                setActionLoading(false);
                return;
            }
        }

        try {
            setActionLoading(true);
            // Khóa thẻ trên CSDL (chuyển trạng thái thẻ -> Đã khóa/vô hiệu hóa, giữ nguyên bản ghi và phiên xe)
            await resolveLostCard(reportIdToUse);

            setCardCancelled(true);
            setWizardStep(4);
            showToast('Đã khóa thẻ thành công! Vui lòng tiến hành thanh toán.', 'success');
            await fetchLostCards();
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể khóa thẻ';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Nút thanh toán cuối cùng (Gọi Backend API thực tế) ──
    const handleFinalizePayment = async () => {
        if (!currentDraftId) {
            showToast('Không tìm thấy mã báo cáo hiện tại.', 'error');
            return;
        }

        try {
            setActionLoading(true);

            // Nếu là thẻ lượt: khởi tạo và xác nhận thu tiền mặt khi bấm nút
            if (createCardCategory === 'casual') {
                const payRes = await initiateLostTurnCardPayment({
                    reportId: currentDraftId,
                    paymentMethod: createPaymentMethod
                });

                if (createPaymentMethod === 'cash' && payRes?.order_code) {
                    // CHỈ KHỞI TẠO PHIẾU THU, KHÔNG GỌI confirmLostTurnCardCash ĐỂ KHÔNG ĐÓNG PHIÊN GỬI XE.
                    // Phiên gửi xe sẽ được đóng tại cổng ra (ExitPaymentPanel) khi Staff bấm Mở barie.
                } else if (createPaymentMethod === 'vnpay' && payRes?.payUrl) {
                    window.location.href = payRes.payUrl;
                    return;
                }
            } else if (createCardCategory === 'month') {
                let targetCode = reissueRfidInput;
                if (!targetCode) {
                    showToast('Vui lòng chọn mã thẻ mới trước khi thanh toán.', 'error');
                    setActionLoading(false);
                    return;
                }

                const payRes = await reissueCard({
                    cardId: cardCheckData?.cardId,
                    newCode: targetCode.trim(),
                    reportId: currentDraftId,
                    paymentMethod: createPaymentMethod
                });

                if (createPaymentMethod === 'cash' && payRes?.order_code) {
                    await confirmReissueCash(payRes.order_code);
                } else if (createPaymentMethod === 'vnpay' && payRes?.payUrl) {
                    window.location.href = payRes.payUrl;
                    return;
                }
            }

            setPaymentDone(true);
            setWizardStep(5);
            if (createCardCategory === 'casual') {
                showToast('Đã ghi nhận thanh toán! Phiên gửi xe vẫn mở — Staff cho xe ra tại cổng ra.', 'success');
            } else {
                showToast('Xử lý báo mất thẻ và thanh toán phí thành công!', 'success');
            }
            await fetchLostCards();
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể hoàn tất thanh toán';
            showToast(message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReissueCard = async (paymentMethod = 'vnpay') => {
        if (!newRfidCode.trim()) {
            showToast('Vui lòng nhập mã thẻ RFID mới!', 'error');
            return;
        }
        if (!editingCard?.card_id) {
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

            const res = await reissueCard({
                cardId: editingCard.card_id,
                newCode: newRfidCode.trim(),
                reportId: editingCard.raw_report_id,
                paymentMethod
            });

            if (paymentMethod === 'defer') {
                showToast('Đã cấp lại thẻ, phí sẽ thu sau!', 'success');
                setEditingCard(null);
                await fetchLostCards();
                return;
            }

            if (paymentMethod === 'cash') {
                showToast('Đã khởi tạo yêu cầu thu tiền mặt thành công!', 'success');
                const orderCode = res?.order_code || `REISSUE-${Date.now()}`;
                setCashPanelData({ orderCode, amount: 50000 });
                setShowCashPanel(true);
                setCashConfirmSuccess(false);
                await fetchLostCards();
                return;
            }

            // VNPay
            showToast('Đã khởi tạo giao dịch thanh toán VNPay!', 'success');
            const payUrl = res?.payUrl;
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
            await confirmReissueCash(cashPanelData.orderCode);
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
            const history = await getLostCardHistory();
            setHistoryData(history || []);
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Không thể tải lịch sử';
            showToast(message, 'error');
            setShowHistoryModal(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleAcceptReport = async () => {
        if (!editingCard?.raw_report_id) {
            showToast('Thiếu mã báo cáo gốc (raw_report_id) - không thể tiếp nhận. Vui lòng tải lại trang.', 'error');
            return;
        }
        try {
            setActionLoading(true);
            await acceptLostCard(editingCard.raw_report_id);
            showToast('Đã tiếp nhận xử lý báo cáo.', 'success');
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
            await cancelLostCard(editingCard.raw_report_id, { note: resolveNote || undefined });
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
            await resolveLostCard(editingCard.raw_report_id, { resolution, note: resolveNote || undefined });
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
            const payload = {
                plate_number: newLostCard.plate_number,
                description: newLostCard.description
            };

            await createLostCard(payload);
            await fetchLostCards();
            setShowCreateModal(false);
            setNewLostCard({
                plate_number: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể tạo báo mất';
            showToast(message, 'error');
        }
    };

    const fetchLostCards = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getLostCards();
            const list = Array.isArray(data) ? data.map(item => {
                let handlerName = item.handler_name || item.handler || item.handled_by_name || item.profiles?.full_name || item.staff_name;
                if (item.handled_by && user?.id && item.handled_by === user.id) {
                    handlerName = currentUserName;
                }

                let displayStatus = item.status;
                if (item.status === 'Đã hủy thẻ') {
                    // Nếu là Tiền mặt (đã thu tại quầy): hiển thị Đã xong (Chờ xe ra bãi)
                    // Nếu là VNPay đang chờ thanh toán HOẶC bấm Xử lý sau: hiển thị Chờ thanh toán
                    displayStatus = (item.pendingPayment && item.pendingPayment.paymentMethod === 'cash') ? 'Đã xong' : 'Chờ thanh toán';
                } else if (item.status === 'Hoàn thành') {
                    displayStatus = 'Đã xong';
                }

                return {
                    ...item,
                    handler_name: handlerName || '---',
                    _backendStatus: item.status, // Giữ nguyên status gốc từ Backend để logic resume đúng
                    status: displayStatus
                };
            }) : [];
            setLostCards(list);
            setFilteredCards(list);
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
            case 'Chờ thanh toán':
                return 'status-cancelled'; // Distinct warning badge
            case 'Đã xong':
            case 'Hoàn thành':
            case 'Đã tìm lại':
                return 'status-recovered';
            case 'Đã hủy (tạo nhầm)':
                return 'status-cancelled-mistake';
            default:
                return 'status-pending';
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
    const waitProcessingCount = pendingCount + processingCount;
    const awaitingPayCount = kpiFilteredCards.filter(c => c.status === 'Chờ thanh toán').length;
    const completedCount = kpiFilteredCards.filter(c => c.status === 'Hoàn thành' || c.status === 'Đã xong').length;
    const totalLostFee = completedCount * 50000;

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
                                <div className="lost-kpi-icon-box icon-blue">
                                    <span className="material-symbols-outlined">sync</span>
                                </div>
                                <span className="lost-kpi-title">Chờ xử lý</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-blue">{waitProcessingCount}</div>
                                <div className="lost-kpi-footer txt-blue">Đã tiếp nhận & Đang xử lý</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-orange">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <span className="lost-kpi-title">Chờ thanh toán</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-orange">{awaitingPayCount}</div>
                                <div className="lost-kpi-footer txt-orange">Đã khóa thẻ & Chờ thu tiền</div>
                            </div>
                        </div>

                        <div className="lost-kpi-card">
                            <div className="lost-kpi-header">
                                <div className="lost-kpi-icon-box icon-green">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                </div>
                                <span className="lost-kpi-title">Thu phí mất thẻ</span>
                            </div>
                            <div className="lost-kpi-body">
                                <div className="lost-kpi-value val-green" style={{ fontSize: '20px' }}>{totalLostFee.toLocaleString('vi-VN')} đ</div>
                                <div className="lost-kpi-footer txt-green">Tổng số tiền phí báo mất</div>
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
                                <span>Chờ xử lý</span>
                                <span><span className="lost-dist-val">{waitProcessingCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((waitProcessingCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-blue" style={{ width: `${totalLost > 0 ? (waitProcessingCount / totalLost) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Chờ thanh toán</span>
                                <span><span className="lost-dist-val">{awaitingPayCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((awaitingPayCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-orange" style={{ width: `${totalLost > 0 ? (awaitingPayCount / totalLost) * 100 : 0}%`, background: '#f59e0b' }}></div>
                            </div>
                        </div>

                        <div className="lost-dist-item">
                            <div className="lost-dist-label-row">
                                <span>Đã xong</span>
                                <span><span className="lost-dist-val">{completedCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((completedCount / totalLost) * 100) : 0}%)</span></span>
                            </div>
                            <div className="lost-dist-track">
                                <div className="lost-dist-fill bg-green" style={{ width: `${totalLost > 0 ? (completedCount / totalLost) * 100 : 0}%` }}></div>
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
                                <option value="Chờ thanh toán">Chờ thanh toán</option>
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
                                        <th>TRẠNG THÁI</th>
                                        <th>NGƯỜI XỬ LÝ</th>
                                        <th style={{ textAlign: 'center' }}>THAO TÁC</th>
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

                                            const displayReportId = typeof reportId === 'string' && reportId.length > 8
                                                ? reportId.substring(0, 8)
                                                : reportId;

                                            return (
                                                <tr key={reportId}>
                                                    <td className="lost-id-cell">
                                                        <div
                                                            className="lost-id-badge-interactive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (popoverState?.id === reportId) {
                                                                    setPopoverState(null);
                                                                } else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setPopoverState({
                                                                        id: reportId,
                                                                        fullId: reportId,
                                                                        x: rect.left,
                                                                        y: rect.top
                                                                    });
                                                                }
                                                            }}
                                                            title="Bấm để xem mã đầy đủ"
                                                        >
                                                            <span>{displayReportId}</span>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.7 }}>touch_app</span>
                                                        </div>
                                                    </td>
                                                    <td>{cardCode}</td>
                                                    <td>{renderPlate(plateNumber)}</td>
                                                    <td>{cardType}</td>
                                                    <td style={{ textAlign: 'left' }}>
                                                        {renderFormattedTime(reportDate)}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge-lost ${getStatusClass(row.status)}`}>
                                                            <span className="dot"></span>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td>{(row.handled_by && user?.id && row.handled_by === user.id) ? currentUserName : (row.handler_name || row.handler || row.profiles?.full_name || '---')}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {row.status === 'Hoàn thành' || row.status === 'Đã xong' || row.status === 'Đã hủy (tạo nhầm)' || (row.status || '').includes('nhầm') || (row.status || '').includes('Hủy') ? (
                                                            <button
                                                                type="button"
                                                                className="lost-action-btn"
                                                                style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                                                                title="Xem chi tiết báo mất thẻ"
                                                                onClick={() => handleResumeReport(row)}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="lost-action-btn"
                                                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                                                                title={`Tiếp tục xử lý báo mất [${row.status || 'Đang xử lý'}]`}
                                                                onClick={() => handleResumeReport(row)}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
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
                    <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '580px', maxWidth: '95%', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                            {/* Modal Header */}
                            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.18)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '22px' }}>visibility</span>
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px', color: '#fff' }}>Chi Tiết Báo Mất Thẻ</h2>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Thông tin hồ sơ và tiến trình xử lý</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingCard(null)}
                                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                </button>
                            </div>

                            <div style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
                                {/* Thông tin chi tiết 2 cột */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', fontSize: '13.5px' }}>
                                        <div><span style={{ color: '#64748b' }}>Mã báo mất:</span> <strong style={{ color: '#0f172a' }}>{editingCard.lost_report_id || editingCard.id || '---'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Mã thẻ:</span> <strong style={{ color: '#2563eb' }}>{editingCard.card_code || editingCard.cardNo || '---'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Biển số xe:</span> <strong style={{ color: '#0f172a' }}>{(editingCard.plate_number || editingCard.plate || '---').toUpperCase()}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Loại thẻ:</span> <strong style={{ color: '#0284c7' }}>{editingCard.card_type || 'Thẻ lượt'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Người xử lý:</span> <strong style={{ color: '#334155' }}>{editingCard.handler_name || '---'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Phí cấp lại:</span> <strong style={{ color: '#b45309' }}>50.000 đ</strong></div>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0 10px' }} />
                                    <div style={{ fontSize: '13.5px', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Nội dung báo mất:</span> <strong style={{ color: '#1e293b' }}>{editingCard.description || editingCard.reason || 'Báo mất thẻ'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                                        <span style={{ color: '#64748b' }}>Trạng thái:</span>
                                        <span className={`status-badge-lost ${getStatusClass(editingCard.status)}`}>
                                            <span className="dot"></span>
                                            {editingCard.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Khu vực hành động bổ sung nếu đơn chưa hoàn thành */}
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

                                {(editingCard.status === 'Đã xong' || editingCard.status === 'Hoàn thành' || (editingCard.status || '').includes('nhầm') || (editingCard.status || '').includes('Hủy')) && (
                                    <div className="lost-form-group">
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, padding: '10px 12px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            {(editingCard.status || '').includes('nhầm') || (editingCard.status || '').includes('Hủy')
                                                ? 'Hồ sơ báo mất này đã bị Hủy (tạo nhầm), không thể tiếp tục xử lý hoặc chỉnh sửa.'
                                                : 'Report này đã được đóng, không thể thao tác thêm.'}
                                        </p>
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
                                                className="btn-cancel btn-cancel-danger"
                                                style={{ flex: 1, padding: '10px 16px' }}
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
                                                                Cấp lại thẻ cho thẻ tháng
                                                            </h3>
                                                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                                                Mã thẻ mới sẽ được gán vào hồ sơ thẻ cũ. Hợp đồng và đăng ký xe giữ nguyên.
                                                            </p>

                                                            <div className="lost-form-group">
                                                                <label>Mã thẻ mới <span style={{ color: '#ef4444' }}>*</span></label>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    <select
                                                                        value={newRfidCode}
                                                                        onChange={(e) => setNewRfidCode(e.target.value)}
                                                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                                                        disabled={loadingAvailableCards}
                                                                    >
                                                                        <option value="" disabled>
                                                                            {loadingAvailableCards ? "Đang tải danh sách thẻ..." : "Chọn mã thẻ mới..."}
                                                                        </option>
                                                                        {availableCards.map(card => (
                                                                            <option key={card.card_id} value={card.code || card.cardNo}>
                                                                                {card.code || card.cardNo}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                {!loadingAvailableCards && availableCards.length === 0 && (
                                                                    <p style={{ fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0' }}>Không có thẻ nào đang chờ trong kho.</p>
                                                                )}
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
                    <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '600px', maxWidth: '95%', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'fadeInScale 0.2s ease-out' }}>
                            {/* Wizard Header */}
                            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)', padding: '20px 24px 16px', color: '#fff', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.18)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '22px' }}>badge</span>
                                        </div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px', color: '#fff' }}>Quy Trình Báo Mất Thẻ</h2>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Màn hình xử lý tập trung nghiệp vụ báo mất</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowCreateModal(false); resetCreateModalState(); }}
                                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                </div>

                                {/* Step Indicator Bar */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', background: 'rgba(0,0,0,0.15)', padding: '5px', borderRadius: '10px', marginTop: '10px' }}>
                                    {[
                                        { step: 1, label: '1. Kiểm tra' },
                                        { step: 2, label: '2. Nhập tin' },
                                        { step: 3, label: '3. Tiếp nhận' },
                                        { step: 4, label: '4. Khóa thẻ' },
                                        { step: 5, label: '5. Thanh toán' }
                                    ].map((s) => (
                                        <div
                                            key={s.step}
                                            style={{
                                                textAlign: 'center', padding: '6px 2px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                                                background: wizardStep === s.step ? '#ffffff' : wizardStep > s.step ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                                                color: wizardStep === s.step ? '#2563eb' : wizardStep > s.step ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                                                boxShadow: wizardStep === s.step ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {s.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Wizard Body */}
                            <div style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
                                {stepError && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
                                        <span style={{ fontWeight: '500' }}>{stepError}</span>
                                    </div>
                                )}

                                {/* ── BƯỚC 1: KIỂM TRA BIỂN SỐ XE ── */}
                                {wizardStep === 1 && (
                                    <div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>BƯỚC 1: KHỞI TẠO BÁO MẤT</span>
                                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                                                Chọn loại thẻ và nhập biển số xe để hệ thống xác minh thông tin báo mất.
                                            </span>
                                        </div>

                                        {/* Toggle Chọn Loại Thẻ (Thẻ lượt / Thẻ tháng) */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                                                Loại thẻ báo mất
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateCardCategory('casual')}
                                                    style={{
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${createCardCategory === 'casual' ? '#2563eb' : '#e2e8f0'}`,
                                                        background: createCardCategory === 'casual' ? '#eff6ff' : '#fff',
                                                        color: createCardCategory === 'casual' ? '#2563eb' : '#64748b',
                                                        fontWeight: '700',
                                                        fontSize: '13.5px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>two_wheeler</span>
                                                    Thẻ lượt (Vé ca)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateCardCategory('month')}
                                                    style={{
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: `2px solid ${createCardCategory === 'month' ? '#2563eb' : '#e2e8f0'}`,
                                                        background: createCardCategory === 'month' ? '#eff6ff' : '#fff',
                                                        color: createCardCategory === 'month' ? '#2563eb' : '#64748b',
                                                        fontWeight: '700',
                                                        fontSize: '13.5px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>credit_card</span>
                                                    Thẻ tháng (Vé tháng)
                                                </button>
                                            </div>
                                        </div>

                                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                                            Biển số xe báo mất <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="Nhập biển số xe (Ví dụ: 30A-12345)..."
                                                value={checkPlateInput}
                                                onChange={(e) => { setCheckPlateInput(e.target.value); setStepError(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleCheckCardInfo(); }}
                                                style={{ flex: 1, height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', outline: 'none' }}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCheckCardInfo}
                                                disabled={cardChecking}
                                                style={{
                                                    height: '42px', padding: '0 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
                                                    fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
                                                {cardChecking ? 'Đang kiểm tra...' : 'Kiểm tra'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ── BƯỚC 2: NHẬP THÔNG TIN THEO LOẠI THẺ ── */}
                                {wizardStep === 2 && cardCheckData && (
                                    <div>
                                        {/* Dynamic Card Type Verification Badge */}
                                        <div style={{
                                            background: createCardCategory === 'casual' ? '#f0fdf4' : '#eff6ff',
                                            border: `1px solid ${createCardCategory === 'casual' ? '#bbf7d0' : '#bfdbfe'}`,
                                            borderRadius: '10px', padding: '14px 16px', marginBottom: '18px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: createCardCategory === 'casual' ? '#166534' : '#1e40af' }}>
                                                    XÁC MINH LOẠI THẺ: {cardCheckData.cardType.toUpperCase()}
                                                </span>
                                                <span style={{ fontSize: '12px', background: createCardCategory === 'casual' ? '#dcfce7' : '#dbeafe', color: createCardCategory === 'casual' ? '#15803d' : '#1d4ed8', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>
                                                    {cardCheckData.cardType}
                                                </span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px' }}>
                                                <div><span style={{ color: '#64748b' }}>Biển số xe:</span> <strong style={{ color: '#0f172a' }}>{checkPlateInput.toUpperCase()}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Trạng thái:</span> <strong style={{ color: '#16a34a' }}>Đang hoạt động</strong></div>
                                                {createCardCategory === 'casual' ? (
                                                    <div><span style={{ color: '#64748b' }}>Xe trong bãi:</span> <strong style={{ color: '#0284c7' }}>Xe đang ở trong bãi</strong></div>
                                                ) : (
                                                    <>
                                                        <div><span style={{ color: '#64748b' }}>Chủ xe:</span> <strong style={{ color: '#0f172a' }}>{cardCheckData.ownerName || '---'}</strong></div>
                                                        <div><span style={{ color: '#64748b' }}>Gói tháng:</span> <strong style={{ color: '#0284c7' }}>{cardCheckData.package || 'Vé tháng'}</strong></div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dynamic Form Content */}
                                        {createCardCategory === 'casual' ? (
                                            /* --- THẺ LƯỢT: Upload Ảnh Cà vẹt (Bắt buộc) + Lý do (Bắt buộc) --- */
                                            <div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                                                        Upload Ảnh Cà vẹt xe (Bắt buộc) <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <div style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '14px', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', position: 'relative' }}>
                                                        <input type="file" accept="image/*" onChange={handleCavetImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                                        {cavetPreviewUrl ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                                <img src={cavetPreviewUrl} alt="Cà vẹt" style={{ height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                                                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>✓ Đã chọn ảnh cà vẹt xe</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#94a3b8' }}>cloud_upload</span>
                                                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>Bấm để chọn hoặc chụp ảnh Cà vẹt xe</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* --- THẺ THÁNG: Upload Ảnh CCCD + Ô nhập Số CCCD + Nút Xác thực --- */
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>badge</span>
                                                    Xác minh thông tin CCCD chủ thẻ tháng
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ảnh CCCD</label>
                                                        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: '#fff', position: 'relative', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <input type="file" accept="image/*" onChange={handleCccdImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                                            {cccdPreviewUrl ? (
                                                                <img src={cccdPreviewUrl} alt="CCCD" style={{ height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ fontSize: '12px', color: '#64748b' }}>📷 Tải ảnh CCCD</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                                                Lý do báo mất thẻ (Bắt buộc) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nhập lý do báo mất thẻ..."
                                                value={createLostReason}
                                                onChange={(e) => setCreateLostReason(e.target.value)}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ── BƯỚC 3: TIẾP NHẬN ĐƠN & KHÓA THẺ BẢO MẬT ── */}
                                {wizardStep === 3 && (
                                    <div>
                                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>warning</span>
                                                YÊU CẦU NGHIỆP VỤ: KHÓA THẺ BẢO MẬT TRƯỚC KHI THANH TOÁN
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: '1.4' }}>
                                                Nhân viên tiến hành <strong>Khóa thẻ</strong> (đổi trạng thái sang Đã khóa). Bản ghi thẻ, thông tin xe và phiên gửi xe vẫn được giữ nguyên trên CSDL để phục vụ tính phí và cho xe xuất bến.
                                            </p>
                                        </div>

                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: '13px' }}>
                                                <div><span style={{ color: '#64748b' }}>Biển số xe:</span> <strong>{checkPlateInput.toUpperCase()}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Loại thẻ:</span> <strong>{cardCheckData?.cardType}</strong></div>
                                                <div><span style={{ color: '#64748b' }}>Trạng thái tiếp nhận:</span> <span style={{ color: '#d97706', fontWeight: '700' }}>Đang xử lý</span></div>
                                                <div><span style={{ color: '#64748b' }}>Người tiếp nhận:</span> <strong>{currentUserName}</strong></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── BƯỚC 4: THANH TOÁN (SAU KHÓA THẺ THÀNH CÔNG) ── */}
                                {wizardStep === 4 && (
                                    <div>
                                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '13px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                                            <span>Thẻ đã được <strong>KHÓA BẢO MẬT</strong> an toàn (giữ nguyên thông tin phiên gửi xe). Đã đủ điều kiện tiến hành thanh toán.</span>
                                        </div>

                                        {/* Payment Breakdown Box */}
                                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '10px' }}>
                                                CHI TIẾT PHÍ THANH TOÁN BÁO MẤT
                                            </span>
                                            {createCardCategory === 'casual' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#64748b' }}>Phí gửi xe trong bãi (Backend):</span>
                                                        <strong style={{ color: '#1e293b' }}>
                                                            {(cardCheckData?.parkingFee ?? 0).toLocaleString('vi-VN')} đ
                                                        </strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#64748b' }}>Phí mất thẻ lượt:</span>
                                                        <strong style={{ color: '#1e293b' }}>
                                                            {(cardCheckData?.lostFee ?? 50000).toLocaleString('vi-VN')} đ
                                                        </strong>
                                                    </div>
                                                    <div style={{ borderTop: '1px dashed #fcd34d', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ color: '#92400e', fontSize: '14px' }}>Tổng thanh toán:</strong>
                                                        <strong style={{ color: '#b45309', fontSize: '18px' }}>
                                                            {(cardCheckData?.totalFee ?? ((cardCheckData?.parkingFee ?? 0) + (cardCheckData?.lostFee ?? 50000))).toLocaleString('vi-VN')} đ
                                                        </strong>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#64748b' }}>Phí cấp thẻ mới:</span>
                                                        <strong style={{ color: '#1e293b' }}>
                                                            {(cardCheckData?.lostFee ?? 50000).toLocaleString('vi-VN')} đ
                                                        </strong>
                                                    </div>
                                                    <div style={{ borderTop: '1px dashed #fcd34d', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ color: '#92400e', fontSize: '14px' }}>Tổng thanh toán:</strong>
                                                        <strong style={{ color: '#b45309', fontSize: '18px' }}>
                                                            {(cardCheckData?.lostFee ?? 50000).toLocaleString('vi-VN')} đ
                                                        </strong>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Selection for Month Card */}
                                        {createCardCategory === 'month' && (
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1e293b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>style</span>
                                                    CHỌN THẺ THÁNG MỚI ĐỂ CẤP LẠI
                                                </h4>
                                                <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '12px', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px' }}>
                                                    Thông tin kế thừa: Chủ xe <strong>{cardCheckData?.ownerName || '---'}</strong> — Biển số <strong>{checkPlateInput.toUpperCase()}</strong> — Gói <strong>{cardCheckData?.package || 'Vé tháng'}</strong>
                                                </div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '4px' }}>Mã thẻ mới <span style={{ color: '#ef4444' }}>*</span></label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <select
                                                        value={reissueRfidInput}
                                                        onChange={(e) => setReissueRfidInput(e.target.value)}
                                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                                                        disabled={loadingAvailableCards}
                                                    >
                                                        <option value="" disabled>
                                                            {loadingAvailableCards ? "Đang tải danh sách thẻ..." : "Chọn mã thẻ mới..."}
                                                        </option>
                                                        {availableCards.map(card => (
                                                            <option key={card.card_id} value={card.code || card.cardNo}>
                                                                {card.code || card.cardNo}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (availableCards.length > 0) {
                                                                setReissueRfidInput(availableCards[0].code || availableCards[0].cardNo);
                                                                showToast('Đã lấy thẻ tự động!', 'success');
                                                            } else {
                                                                showToast('Không có thẻ trống nào!', 'error');
                                                            }
                                                        }}
                                                        style={{ padding: '0 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                                                        Lấy tự động
                                                    </button>
                                                </div>
                                                {!loadingAvailableCards && availableCards.length === 0 && (
                                                    <p style={{ fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0' }}>Không có thẻ nào đang chờ trong kho.</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Payment Methods */}
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                                                Chọn phương thức thanh toán
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <label style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                                                    border: `2px solid ${createPaymentMethod === 'cash' ? '#16a34a' : '#cbd5e1'}`,
                                                    background: createPaymentMethod === 'cash' ? '#f0fdf4' : '#fff'
                                                }}>
                                                    <input type="radio" name="createPaymentMethod" value="cash" checked={createPaymentMethod === 'cash'} onChange={() => setCreatePaymentMethod('cash')} style={{ accentColor: '#16a34a' }} />
                                                    <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '20px' }}>payments</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>Tiền mặt</span>
                                                </label>

                                                <label style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                                                    border: `2px solid ${createPaymentMethod === 'vnpay' ? '#2563eb' : '#cbd5e1'}`,
                                                    background: createPaymentMethod === 'vnpay' ? '#eff6ff' : '#fff'
                                                }}>
                                                    <input type="radio" name="createPaymentMethod" value="vnpay" checked={createPaymentMethod === 'vnpay'} onChange={() => setCreatePaymentMethod('vnpay')} style={{ accentColor: '#2563eb' }} />
                                                    <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '20px' }}>credit_card</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>VNPay Sandbox</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── BƯỚC 5: HOÀN TẤT & QUY TRÌNH TIẾP THEO (XE RA / CẤP THẺ MỚI) ── */}
                                {wizardStep === 5 && (
                                    <div>
                                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '18px', textAlign: 'center' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#16a34a', display: 'block', marginBottom: '4px' }}>check_circle</span>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#166534' }}>
                                                {createCardCategory === 'casual' ? 'ĐÃ GHI NHẬN THANH TOÁN — CHỜ XE RA' : 'BÁO MẤT VÀ THANH TOÁN HOÀN TẤT'}
                                            </h3>
                                        </div>

                                        {createCardCategory === 'casual' ? (
                                            /* --- Thẻ lượt: Thông tin màn hình Quản lý xe ra/vào cho Staff cho xe ra --- */
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1e293b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>directions_car</span>
                                                    THÔNG TIN XE CHO RA BÃI (QUẢN LÝ XE RA/VÀO)
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px' }}>
                                                    <div><span style={{ color: '#64748b' }}>Biển số xe:</span> <strong style={{ color: '#0284c7' }}>{checkPlateInput.toUpperCase()}</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Phí gửi xe:</span> <strong>{(cardCheckData?.parkingFee ?? 0).toLocaleString('vi-VN')} đ</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Phí mất thẻ:</span> <strong>{(cardCheckData?.lostFee ?? 50000).toLocaleString('vi-VN')} đ</strong></div>
                                                    <div><span style={{ color: '#64748b' }}>Tổng thanh toán:</span> <strong>{(cardCheckData?.totalFee ?? ((cardCheckData?.parkingFee ?? 0) + (cardCheckData?.lostFee ?? 50000))).toLocaleString('vi-VN')} đ</strong></div>
                                                    <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                                                        <span style={{ color: '#64748b' }}>Trạng thái:</span> <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>ĐÃ THANH TOÁN (CHỜ XE RA)</span>
                                                    </div>
                                                </div>

                                                <p style={{ fontSize: '12px', color: '#0369a1', marginTop: '12px', marginBottom: 0, fontStyle: 'italic', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px' }}>
                                                    ℹ️ Phiên gửi xe <strong>vẫn đang mở</strong>. Xe chỉ chính thức xuất bến và đóng phiên khi Staff nhập biển số <strong>{checkPlateInput.toUpperCase()}</strong> tại cổng ra và bấm <strong>"Mở barie / Cho xe ra"</strong>.
                                                </p>
                                            </div>
                                        ) : (
                                            /* --- Thẻ tháng: Quy trình cấp thẻ tháng mới --- */
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#1e293b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>task_alt</span>
                                                    HOÀN TẤT CẤP LẠI THẺ THÁNG
                                                </h4>
                                                <div style={{ fontSize: '14px', color: '#1e293b', padding: '16px 0' }}>
                                                    Vui lòng lấy thẻ vật lý có mã <strong style={{ color: '#0284c7', fontSize: '18px' }}>{reissueRfidInput}</strong> giao cho khách hàng.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Wizard Footer Actions */}
                            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateModal(false); resetCreateModalState(); }}
                                        style={{ height: '40px', padding: '0 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                                        disabled={actionLoading}
                                    >
                                        {wizardStep === 5 ? 'Đóng' : 'Hủy bỏ'}
                                    </button>

                                    {wizardStep >= 1 && wizardStep < 5 && (
                                        <button
                                            type="button"
                                            onClick={handleProcessLater}
                                            style={{ height: '40px', padding: '0 18px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#b45309', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            disabled={actionLoading}
                                            title="Tạm dừng xử lý và quay về Nhật ký mất thẻ"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pause_circle</span>
                                            Xử lý sau
                                        </button>
                                    )}
                                </div>

                                <div>
                                    {wizardStep === 2 && (
                                        <button
                                            type="button"
                                            onClick={handleAcceptAndCreateReport}
                                            disabled={actionLoading}
                                            style={{ height: '40px', padding: '0 22px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {actionLoading ? 'Đang tiếp nhận...' : 'Tiếp tục (Tiếp nhận đơn)'}
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                                        </button>
                                    )}

                                    {wizardStep === 3 && (
                                        <button
                                            type="button"
                                            onClick={handleConfirmCancelCard}
                                            disabled={actionLoading}
                                            style={{ height: '40px', padding: '0 22px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                                            Xác nhận Khóa thẻ
                                        </button>
                                    )}

                                    {wizardStep === 4 && (
                                        <button
                                            type="button"
                                            onClick={handleFinalizePayment}
                                            disabled={actionLoading}
                                            style={{ height: '40px', padding: '0 22px', borderRadius: '8px', border: 'none', background: createPaymentMethod === 'cash' ? '#16a34a' : '#2563eb', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                                            {actionLoading ? 'Đang xử lý...' : createPaymentMethod === 'cash' ? 'Xác nhận đã thu tiền' : 'Thanh toán qua VNPay'}
                                        </button>
                                    )}

                                    {wizardStep === 5 && (
                                        <button
                                            type="button"
                                            onClick={() => { setShowCreateModal(false); resetCreateModalState(); }}
                                            style={{ height: '40px', padding: '0 22px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Hoàn tất & Quay về Nhật ký
                                        </button>
                                    )}
                                </div>
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
                                                            <div key={item.log_id} className="history-card" style={{ borderLeftColor: colorClass, padding: '14px 16px', background: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
                                                                <div className="history-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                                                                    <div className="history-action-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                        <span style={{
                                                                            display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '6px',
                                                                            fontSize: '12px', fontWeight: '700', color: colorClass, background: `${colorClass}18`,
                                                                            border: `1px solid ${colorClass}35`
                                                                        }}>
                                                                            {item.action}
                                                                        </span>
                                                                        <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '13px' }}>
                                                                            Thẻ: <strong style={{ color: '#0f172a' }}>{item.card_code}</strong> {item.plate_number ? `(${item.plate_number})` : ''}
                                                                        </span>
                                                                    </div>
                                                                    <div className="history-card-time" style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#94a3b8' }}>schedule</span>
                                                                        <span>{new Date(item.performed_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                                                                        <span style={{ color: '#0284c7', fontWeight: '600', marginLeft: '4px' }}>• {item.performed_by_name}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="history-card-note" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#334155' }}>
                                                                    <div style={{ fontWeight: '600', color: '#64748b', marginBottom: '3px', fontSize: '11.5px', textTransform: 'uppercase' }}>Ghi chú:</div>
                                                                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{noteText}</div>
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

                {/* Modal xác nhận Khóa thẻ (Centered Dialog UI) */}
                {showCancelConfirmDialog && (
                    <div className="lost-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '440px', maxWidth: '90%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'fadeInScale 0.15s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>lock</span>
                                </div>
                            </div>
                            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>Xác Nhận Hủy Thẻ Bảo Mật?</h3>
                            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#475569', textAlign: 'center', lineHeight: '1.5' }}>
                                Thẻ này sẽ được <strong>chuyển sang trạng thái Đã hủy</strong> trên hệ thống. Thông tin xe và phiên gửi xe vẫn được bảo toàn để phục vụ tính phí và cho xe xuất bến.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCancelConfirmDialog(false)}
                                    style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="button"
                                    onClick={executeCancelCard}
                                    style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                                    Xác nhận Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Fixed Popover nổi trên cùng màn hình phía trên badge (không bị che bởi bất kỳ overflow nào) */}
                {popoverState && (
                    <div
                        className="lost-id-fixed-popover"
                        style={{
                            position: 'fixed',
                            top: `${Math.max(10, popoverState.y - 44)}px`,
                            left: `${Math.max(10, popoverState.x)}px`,
                            zIndex: 999999
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="lost-id-code-text">{popoverState.fullId}</span>
                        <button
                            type="button"
                            className="lost-id-copy-mini-btn"
                            title="Sao chép mã"
                            onClick={() => {
                                if (navigator.clipboard) {
                                    navigator.clipboard.writeText(popoverState.fullId);
                                    showToast(`Đã sao chép: ${popoverState.fullId}`, 'success');
                                }
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>content_copy</span>
                            <span>Sao chép</span>
                        </button>
                        <div className="lost-id-arrow-down"></div>
                    </div>
                )}
            </div>
        </section>
    );

}