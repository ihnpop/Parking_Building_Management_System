import { useState, useRef, useEffect } from 'react';
import {
    uploadGateFile,
    simulateOcrFile,
    preCheckEntryGate,
    entryGate,
    preCheckExitGate,
    exitGate,
    getParkingStats,
    getParkingSessions
} from '../../../service/parkingApi';
import { createCheckoutPayment } from '../../../service/paymentApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../config/supabaseClient';
import { useNotification } from '../../../context/NotificationContext';

const cameraCards = [
    {
        id: 'vehicleImage',
        title: 'Camera 01 - Toàn cảnh VÀO',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDM7hJvEzwj5N8Ecltn_8mNmwCmHC40GPQLUzrPpYJ3Tljm187mQfYN7L2m5AQPX-Z23j1SiukOmWd5mZYS3zwDxGw4zGLe-aLWV6n3yP73FpIXiraqm_cL0Bsy4dN7KpnJQ1SWrczGDUq8JFEQfBzQSLPHpZbEVZyMlaP9VA75RK12SP-5oXHNPf5wNWvnd6Ni7pD_m5VR7e0bfHXaTvRnvwsnV7yzY92x1E-qo4kdpJp473Clxs7tzSKXNTz_tDSx953gGoukxvk',
        badgeClass: 'camera-badge-record',
    },
    {
        id: 'plateImage',
        title: 'Camera 02 - Biển số VÀO',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBY_qQ9w1hTwomzRMVxQ_cRALiO7poUpyGH1d3L0BBc0z08g2A6uhN9AdQexl9JYb6VtLi2iuOqTbW3DSJotPZxrJllI0aHC5CPNpLQTmD8UIekVaSmP79O8332EpfIlwC1L22wcXGMvEmYrBRIGbaGtSZGflODD7zMesEs_nUSi8ncvTapJXU9_ntgQdVTCK2CposjUZXTOC40qJ4OMb_eccDmW7JE2u59YBJxOp_x_Mz97TbHeh_hwM1Oczzwci2Qmyhd0XFTHno',
    },
    {
        id: 'camera3',
        title: 'Camera 03 - Toàn cảnh RA',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB1utp_U-WKcOZcqCWl6rsHwW8kbASOtTw-vaMhAXERRCZZJm_e2ID2rxbr2zJLynsq0_FL_FHGiGQmxl4wHqA-Ucn3socPr0SK3g0C3yYR-j52-rjoyYe-upJtUXBGHJGLzvuf9l21-GFQ76XBhf1upX4OhAneef7Rg9UdMz0PGryoBCMISIAEhfFc-2N_FjpDI85Rap0ZWoZ69pV5DFYw45Zoq0Ia3er1pH-lQsAxdBPLMIBktImLUiGSL-80wfLmNrtgzTlA-jw',
    },
    {
        id: 'camera4',
        title: 'Camera 04 - Biển số RA',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDJCOcqayYGfaWqXDR4TjBRcDUAGQyuvhkTCQ3r2Ivprb_szJonOqtBHW-ICNPYfFv97j3bVpHhH-WnSA4aS2MCIYAuo40ZbNe02ndW35ycuxzb_SF9PEYBs5oL0UVMatcLg6wI6fohgpgo1GWmXT4eX2ujtuTCWlPYYZBc88zmIKNCnhQ8mGiDg5muXtxL4-loBashck6sklVinfS5HN2mCsxrgS2gT725B0SaQ6_FovbCcTfINamNS7eRSyYTR8rsROnXGYm3pdU',
    },
]


const actionShortcuts = [
    { label: 'F1', text: 'Thống kê', primary: false },
    { label: 'F2', text: 'Báo cáo', primary: false },
]


export default function SystemOperations() {
    const { showToast } = useNotification();
    // ── Mode State ───────────────────────────────────────────────────────────
    const [mode, setMode] = useState('IN'); // 'IN' or 'OUT'

    // ── Check-In State ───────────────────────────────────────────────────────
    const [plateNumber, setPlateNumber] = useState('');
    const [vehicleImage, setVehicleImage] = useState(null);
    const [plateImage, setPlateImage] = useState(null);
    const [vehiclePreview, setVehiclePreview] = useState(null);
    const [platePreview, setPlatePreview] = useState(null);
    const [vehicleType, setVehicleType] = useState('Xe máy');

    // ── Check-Out State ──────────────────────────────────────────────────────
    const [exitVehicleImage, setExitVehicleImage] = useState(null);
    const [exitPlateImage, setExitPlateImage] = useState(null);
    const [exitVehiclePreview, setExitVehiclePreview] = useState(null);
    const [exitPlatePreview, setExitPlatePreview] = useState(null);

    // ── Simulator Gate States ────────────────────────────────────────────────
    const [preCheckResult, setPreCheckResult] = useState(null);
    const [selectedCard, setSelectedCard] = useState('');
    const [entryVehicleUrl, setEntryVehicleUrl] = useState('');
    const [entryPlateUrl, setEntryPlateUrl] = useState('');
    const [exitVehicleUrl, setExitVehicleUrl] = useState('');
    const [exitPlateUrl, setExitPlateUrl] = useState('');
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // ── Ảnh check-in để hiển thị trên Camera 1 & 2 khi check-out ─────────────
    const [entryVehicleImageDisplay, setEntryVehicleImageDisplay] = useState(null);
    const [entryPlateImageDisplay, setEntryPlateImageDisplay] = useState(null);

    // ── UI States ────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [hoveredCamera, setHoveredCamera] = useState(null);
    const [lastSession, setLastSession] = useState(null);
    const [stats, setStats] = useState({ insideCount: 0, inCount: 0, outCount: 0 });
    const [recentSessions, setRecentSessions] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchRecentSessions = async () => {
        try {
            const data = await getParkingSessions();
            if (data.success) {
                const sorted = (data.sessions || []).sort((a, b) => {
                    const timeA = new Date(a.exit_time || a.entry_time).getTime();
                    const timeB = new Date(b.exit_time || b.entry_time).getTime();
                    return timeB - timeA;
                });
                setRecentSessions(sorted.slice(0, 3));
            }
        } catch (err) {
            console.error("Error fetching recent sessions:", err);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        try {
            const data = await getParkingStats();
            if (data.success) {
                setStats({
                    insideCount: data.insideCount,
                    inCount: data.inCount,
                    outCount: data.outCount
                });
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };



    // Input Refs for programmatic clicks
    const vehicleInputRef = useRef(null);
    const plateInputRef = useRef(null);
    const exitVehicleInputRef = useRef(null);
    const exitPlateInputRef = useRef(null);

    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const checkBuildingAssignment = async () => {
            if (!user) return;
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('building_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data && !data.building_id) {
                    showToast('Tài khoản của bạn chưa được phân công tòa nhà. Không thể thực hiện Check-in/Check-out.', 'error');
                }
            } catch (err) {
                console.error("Error checking building assignment:", err);
            }
        };
        checkBuildingAssignment();
    }, [user]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const resetInForm = () => {
        setPlateNumber('');
        setVehicleImage(null);
        setPlateImage(null);
        setVehiclePreview(null);
        setPlatePreview(null);
        setPreCheckResult(null);
        setSelectedCard('');
        setEntryVehicleUrl('');
        setEntryPlateUrl('');
        setVehicleType('Xe máy');
    };

    const resetOutForm = () => {
        setPlateNumber('');
        setExitVehicleImage(null);
        setExitPlateImage(null);
        setExitVehiclePreview(null);
        setExitPlatePreview(null);
        setVehiclePreview(null);
        setPlatePreview(null);
        setPreCheckResult(null);
        setSelectedCard('');
        setExitVehicleUrl('');
        setExitPlateUrl('');
        setVehicleType('Xe máy');
        // Xóa ảnh check-in hiển thị trên camera 1&2
        setEntryVehicleImageDisplay(null);
        setEntryPlateImageDisplay(null);
    };

    const handlePreCheck = async (plate) => {
        if (!plate || !plate.trim()) return;
        try {
            setLoading(true);
            if (mode === 'IN') {
                const res = await preCheckEntryGate(plate);
                setPreCheckResult(res);
                if (res.vehicleType === 'VISITOR') {
                    // Mặc định chọn thẻ đầu tiên nếu có
                    if (res.availableCards?.length > 0) {
                        setSelectedCard(res.availableCards[0].code);
                    } else {
                        setSelectedCard('');
                    }
                } else {
                    setSelectedCard('');
                    // Tự động đặt loại xe khớp với dữ liệu đã đăng ký trong DB
                    if (res.vehicleCategory) {
                        setVehicleType(res.vehicleCategory);
                    }
                }
            } else {
                const res = await preCheckExitGate(plate);
                setPreCheckResult(res);
                // Lưu riêng ảnh check-in để hiển thị trực tiếp lên camera 1 & 2
                setEntryVehicleImageDisplay(res.entryVehicleImage || null);
                setEntryPlateImageDisplay(res.entryPlateImage || null);
            }
        } catch (err) {
            console.error("Precheck error:", err);
            showToast(err.response?.data?.message || err.message || "Lỗi kiểm tra thông tin xe.", "error");
            setPreCheckResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCameraClick = (id) => {
        if (id === 'vehicleImage') {
            vehicleInputRef.current?.click();
            setMode('IN');
        } else if (id === 'plateImage') {
            plateInputRef.current?.click();
            setMode('IN');
        } else if (id === 'camera3') {
            exitVehicleInputRef.current?.click();
            setMode('OUT');
        } else if (id === 'camera4') {
            exitPlateInputRef.current?.click();
            setMode('OUT');
        }
    };

    const handleCheckInSubmit = async () => {
        if (!plateNumber.trim()) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }

        if (!preCheckResult) return;

        try {
            setLoading(true);
            let result;

            if (preCheckResult.vehicleType === 'VISITOR') {
                if (!selectedCard) {
                    showToast('Vui lòng chọn thẻ lượt vãng lai để simulate tap.', 'error');
                    setLoading(false);
                    return;
                }
                result = await entryGate({
                    cardCode: selectedCard,
                    plateNumber: plateNumber.trim().toUpperCase(),
                    entryVehicleImage: entryVehicleUrl || null,
                    entryPlateImage: entryPlateUrl || null,
                    vehicleType: vehicleType
                });
            } else {
                // Monthly
                if (preCheckResult.canOpenGate === false) {
                    showToast(preCheckResult.message || 'Xe tháng không đủ điều kiện mở cổng.', 'error');
                    setLoading(false);
                    return;
                }
                result = await entryGate({
                    plateNumber: plateNumber.trim().toUpperCase(),
                    entryVehicleImage: entryVehicleUrl || null,
                    entryPlateImage: entryPlateUrl || null
                });
            }

            if (result.success) {
                showToast(result.message || 'Check in thành công!', 'success');
                setLastSession({
                    ...result.session,
                    type: 'IN'
                });
                resetInForm();
                fetchStats();
                fetchRecentSessions();
            } else {
                showToast(result.message || 'Check in thất bại.', 'error');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Đã xảy ra lỗi khi check in.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOutSubmit = async () => {
        if (!plateNumber.trim()) {
            showToast('Vui lòng nhập biển số xe cần check-out.', 'error');
            return;
        }

        if (!preCheckResult) return;

        try {
            setLoading(true);
            let result;

            if (preCheckResult.vehicleType === 'VISITOR') {
                result = await exitGate({
                    cardCode: preCheckResult.cardCode,
                    plateNumber: plateNumber.trim().toUpperCase(),
                    exitVehicleImage: exitVehicleUrl || null,
                    exitPlateImage: exitPlateUrl || null
                });
            } else {
                // Monthly
                result = await exitGate({
                    plateNumber: plateNumber.trim().toUpperCase(),
                    exitVehicleImage: exitVehicleUrl || null,
                    exitPlateImage: exitPlateUrl || null
                });
            }

            if (result.success) {
                showToast(result.message || 'Check out thành công!', 'success');
                setLastSession({
                    ...result.session,
                    fee: preCheckResult.fee,
                    plate_number: plateNumber.trim().toUpperCase(),
                    entry_time: result.session?.entry_time || new Date().toISOString(),
                    exit_time: result.session?.exit_time || new Date().toISOString(),
                    type: 'OUT',
                    status: 'Hoàn thành'
                });
                resetOutForm();
                fetchStats();
                fetchRecentSessions();
            } else {
                showToast(result.message || 'Check out thất bại.', 'error');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Đã xảy ra lỗi khi check out.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVnpayCheckout = async () => {
        if (!preCheckResult || !preCheckResult.sessionId) {
            showToast('Không tìm thấy thông tin phiên gửi xe.', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await createCheckoutPayment(preCheckResult.sessionId, preCheckResult.fee);
            if (response.data?.payUrl) {
                showToast("Đang chuyển hướng sang VNPAY...", "success");
                setTimeout(() => {
                    window.location.href = response.data.payUrl;
                }, 1000);
            } else {
                throw new Error("Không khởi tạo được đường dẫn thanh toán");
            }
        } catch (err) {
            console.error("Lỗi khởi tạo thanh toán VNPAY:", err);
            const msg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi khởi tạo thanh toán VNPAY.";
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!plateNumber.trim()) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }
        // Bước 2: Nếu đã precheck rồi -> xác nhận luôn
        if (preCheckResult) {
            if (mode === 'IN') {
                await handleCheckInSubmit();
            } else {
                await handleCheckOutSubmit();
            }
            return;
        }
        // Bước 1: Chưa precheck -> gọi precheck để hiện thông tin
        await handlePreCheck(plateNumber);
    };
    useEffect(() => {
        fetchStats();
        fetchRecentSessions();
    }, []);
    const latestHandlersRef = useRef({
        handleCheckInSubmit,
        handleCheckOutSubmit,
        handlePreCheck,
        mode,
        plateNumber,
        preCheckResult
    });

    useEffect(() => {
        latestHandlersRef.current = {
            handleCheckInSubmit,
            handleCheckOutSubmit,
            handlePreCheck,
            mode,
            plateNumber,
            preCheckResult
        };
    });

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'F1') {
                event.preventDefault();
                navigate('/login/dashboard/OccupancyChart');
            }
            if (event.key === 'F2') {
                event.preventDefault();
                navigate('/login/dashboard/lost-card-log');
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                const {
                    handleCheckInSubmit: latestCheckIn,
                    handleCheckOutSubmit: latestCheckOut,
                    handlePreCheck: latestPreCheck,
                    mode: currentMode,
                    plateNumber: currentPlate,
                    preCheckResult: currentPreCheck
                } = latestHandlersRef.current;

                if (currentPreCheck) {
                    if (currentMode === 'IN') {
                        latestCheckIn();
                    } else {
                        latestCheckOut();
                    }
                } else {
                    latestPreCheck(currentPlate);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigate]);
    return (
        <div className="system-page">
            {/* Hidden File Inputs for uploads */}
            <input
                type="file"
                ref={vehicleInputRef}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setVehicleImage(file);
                        setVehiclePreview(URL.createObjectURL(file));
                        try {
                            showToast("Đang tải ảnh xe lên...", "success");
                            const res = await uploadGateFile(file, "entry/vehicle");
                            setEntryVehicleUrl(res.publicUrl);
                            showToast("Tải ảnh xe lên thành công.", "success");
                        } catch (err) {
                            showToast("Lỗi tải ảnh xe.", "error");
                        }
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={plateInputRef}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setPlateImage(file);
                        setPlatePreview(URL.createObjectURL(file));
                        try {
                            showToast("Đang xử lý ảnh biển số và OCR...", "success");
                            const uploadRes = await uploadGateFile(file, "entry/plate");
                            setEntryPlateUrl(uploadRes.publicUrl);

                            const ocrRes = await simulateOcrFile(file);
                            if (ocrRes.success) {
                                setPlateNumber(ocrRes.plateNumber);
                                showToast(`OCR nhận diện biển số: ${ocrRes.plateNumber}`, "success");
                            }
                        } catch (err) {
                            showToast("Lỗi tải ảnh hoặc OCR.", "error");
                        }
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={exitVehicleInputRef}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setExitVehicleImage(file);
                        setExitVehiclePreview(URL.createObjectURL(file));
                        try {
                            showToast("Đang tải ảnh xe ra...", "success");
                            const res = await uploadGateFile(file, "exit/vehicle");
                            setExitVehicleUrl(res.publicUrl);
                            showToast("Tải ảnh xe ra thành công.", "success");
                        } catch (err) {
                            showToast("Lỗi tải ảnh xe ra.", "error");
                        }
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={exitPlateInputRef}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setExitPlateImage(file);
                        setExitPlatePreview(URL.createObjectURL(file));
                        try {
                            showToast("Đang xử lý ảnh biển số ra và OCR...", "success");
                            const uploadRes = await uploadGateFile(file, "exit/plate");
                            setExitPlateUrl(uploadRes.publicUrl);

                            const ocrRes = await simulateOcrFile(file);
                            if (ocrRes.success) {
                                setPlateNumber(ocrRes.plateNumber);
                                showToast(`OCR nhận diện biển số ra: ${ocrRes.plateNumber}`, "success");
                            }
                        } catch (err) {
                            showToast("Lỗi tải ảnh hoặc OCR.", "error");
                        }
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />



            <main className="system-content">
                <section className="stats-grid">
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Số lượng xe trong bãi</p>
                            <p className="stat-value">{stats.insideCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-primary">
                            <span className="material-symbols-outlined">local_parking</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã vào</p>
                            <p className="stat-value">{stats.inCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-secondary">
                            <span className="material-symbols-outlined">login</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã ra</p>
                            <p className="stat-value">{stats.outCount}</p>
                        </div>
                        <div className="stat-icon stat-icon-tertiary">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                    </article>
                </section>


                <section className="camera-grid">
                    {[cameraCards[0], cameraCards[1], cameraCards[2], cameraCards[3]].map((camera) => {
                        const isCameraIn = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                        const isCurrentlyActiveMode = (mode === 'IN' && isCameraIn) ||
                            (mode === 'OUT' && !isCameraIn) ||
                            (mode === 'OUT' && isCameraIn && preCheckResult);

                        let bgImage = camera.image;
                        let isSelected = false;

                        if (camera.id === 'vehicleImage') {
                            // Khi check-out: ưu tiên dùng ảnh xe check-in đã lưu riêng
                            if (mode === 'OUT' && entryVehicleImageDisplay) {
                                bgImage = entryVehicleImageDisplay;
                            } else {
                                bgImage = vehiclePreview || camera.image;
                            }
                            isSelected = !!vehicleImage;
                        } else if (camera.id === 'plateImage') {
                            // Khi check-out: ưu tiên dùng ảnh biển số check-in đã lưu riêng
                            if (mode === 'OUT' && entryPlateImageDisplay) {
                                bgImage = entryPlateImageDisplay;
                            } else {
                                bgImage = platePreview || camera.image;
                            }
                            isSelected = !!plateImage;
                        } else if (camera.id === 'camera3') {
                            bgImage = exitVehiclePreview || camera.image;
                            isSelected = !!exitVehicleImage;
                        } else if (camera.id === 'camera4') {
                            bgImage = exitPlatePreview || camera.image;
                            isSelected = !!exitPlateImage;
                        }

                        return (
                            <article
                                key={camera.title}
                                className="camera-card"
                                style={{
                                    opacity: isCurrentlyActiveMode ? 1 : 0.7,
                                    transition: 'opacity 0.25s ease'
                                }}
                            >
                                <div
                                    className="camera-image"
                                    style={{
                                        backgroundImage: `url(${bgImage})`,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        // Camera 1 & 2 ở mode OUT khi đã có ảnh check-in: không cho upload
                                        const isEntryCamera = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                                        const hasEntryImage = isEntryCamera && mode === 'OUT' &&
                                            (camera.id === 'vehicleImage' ? entryVehicleImageDisplay : entryPlateImageDisplay);
                                        if (!hasEntryImage) {
                                            handleCameraClick(camera.id);
                                        }
                                    }}
                                    onMouseEnter={() => setHoveredCamera(camera.id)}
                                    onMouseLeave={() => setHoveredCamera(null)}
                                >
                                    <span className="camera-label">{camera.title}</span>
                                    {camera.badge && <span className={`camera-badge ${camera.badgeClass}`}>{camera.badge}</span>}

                                    {/* Badge hiển thị "ẢNH CHECK-IN" khi camera 1&2 đang xem ảnh lịch sử */}
                                    {(() => {
                                        const isEntryCamera = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                                        const entryImgUrl = camera.id === 'vehicleImage'
                                            ? entryVehicleImageDisplay
                                            : entryPlateImageDisplay;
                                        if (isEntryCamera && mode === 'OUT' && entryImgUrl) {
                                            // return (
                                            // <div style={{
                                            //     position: 'absolute',
                                            //     bottom: 8,
                                            //     left: '50%',
                                            //     transform: 'translateX(-50%)',
                                            //     background: 'rgba(234, 88, 12, 0.92)',
                                            //     color: 'white',
                                            //     fontSize: 11,
                                            //     fontWeight: 'bold',
                                            //     padding: '3px 10px',
                                            //     borderRadius: 20,
                                            //     letterSpacing: '0.05em',
                                            //     whiteSpace: 'nowrap',
                                            //     zIndex: 15,
                                            //     display: 'flex',
                                            //     alignItems: 'center',
                                            //     gap: 4
                                            // }}>
                                            //     {/* <span className="material-symbols-outlined" style={{ fontSize: 13 }}>history</span>
                                            //     ẢNH CHECK-IN */}
                                            // </div>
                                            // );
                                        }
                                        return null;
                                    })()}

                                    {/* Overlay showing upload message on hover - chỉ hiện khi được phép upload */}
                                    {(() => {
                                        const isEntryCamera = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                                        const entryImgUrl = camera.id === 'vehicleImage'
                                            ? entryVehicleImageDisplay
                                            : entryPlateImageDisplay;
                                        const isReadOnly = isEntryCamera && mode === 'OUT' && entryImgUrl;
                                        if (isReadOnly) return null;
                                        return (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    backgroundColor: hoveredCamera === camera.id ? 'rgba(15, 23, 42, 0.6)' : 'rgba(0, 0, 0, 0)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s ease',
                                                    opacity: hoveredCamera === camera.id ? 1 : 0,
                                                    pointerEvents: 'none',
                                                    color: 'white',
                                                    gap: '8px',
                                                    zIndex: 10
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 40 }}>add_a_photo</span>
                                                <span style={{ fontSize: 13, fontWeight: 'bold' }}>
                                                    {camera.id === 'vehicleImage' ? 'Click tải ảnh xe vào' :
                                                        camera.id === 'plateImage' ? 'Click tải ảnh biển số vào' :
                                                            camera.id === 'camera3' ? 'Click tải ảnh xe ra' :
                                                                'Click tải ảnh biển số ra'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="active-transaction">
                    {/* Tab Switcher inside the transaction card */}
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        gap: '12px',
                        borderBottom: '1px solid #e5e7eb',
                        paddingBottom: '12px',
                        marginBottom: '-8px'
                    }}>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('IN');
                                // Khi chuyển về mode IN: xóa preCheck, preview EXIT và ảnh check-in hiển thị
                                setPreCheckResult(null);
                                setExitVehiclePreview(null);
                                setExitPlatePreview(null);
                                setPlateNumber('');
                                setEntryVehicleImageDisplay(null);
                                setEntryPlateImageDisplay(null);
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '10px',
                                border: 'none',
                                background: mode === 'IN' ? '#2563eb' : '#f3f4f6',
                                color: mode === 'IN' ? 'white' : '#4b5563',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                            XE VÀO
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('OUT');
                                // Khi chuyển sang mode OUT: xóa preCheck, preview IN và ảnh check-in cũ
                                // sau đó khi preCheckResult được set thì camera 1&2 sẽ hiển thị ảnh check-in
                                setPreCheckResult(null);
                                setVehiclePreview(null);
                                setPlatePreview(null);
                                setPlateNumber('');
                                setEntryVehicleImageDisplay(null);
                                setEntryPlateImageDisplay(null);
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                borderRadius: '10px',
                                border: 'none',
                                background: mode === 'OUT' ? '#2563eb' : '#f3f4f6',
                                color: mode === 'OUT' ? 'white' : '#4b5563',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                            XE RA
                        </button>
                    </div>

                    <form
                        className="transaction-highlight"
                        onSubmit={handleFormSubmit}
                    >
                        <p className="transaction-label">
                            {mode === 'IN' ? 'Biển số xe vào' : 'Biển số xe ra'}
                        </p>
                        <input
                            type="text"
                            placeholder="NHẬP BIỂN SỐ..."
                            className="transaction-plate"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                            disabled={loading}
                            style={{
                                width: '100%',
                                border: '2px dashed #3b82f6',
                                outline: 'none',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                cursor: 'text'
                            }}
                        />

                        {/* Selector Loại xe - Luôn hiện, tự động điền đúng khi là xe tháng */}
                        <div className="vehicle-type-container">
                            <label className="vehicle-type-label">Loại xe:</label>
                            <div className="vehicle-type-buttons">
                                <button
                                    type="button"
                                    onClick={() => setVehicleType('Xe máy')}
                                    className={`vehicle-type-btn ${vehicleType === 'Xe máy' ? 'active' : ''}`}
                                    disabled={loading}
                                >
                                    <span className="material-symbols-outlined">two_wheeler</span>
                                    <span>Xe máy</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVehicleType('Ô tô')}
                                    className={`vehicle-type-btn ${vehicleType === 'Ô tô' ? 'active' : ''}`}
                                    disabled={loading}
                                >
                                    <span className="material-symbols-outlined">directions_car</span>
                                    <span>Ô tô</span>
                                </button>
                            </div>
                        </div>

                        {/* Cảnh báo loại xe không khớp - Chỉ hiện khi là xe tháng và staff đã chọn loại xe sai */}
                        {mode === 'IN' && preCheckResult?.vehicleType === 'MONTHLY' && preCheckResult?.vehicleCategory && (() => {
                            const registeredType = preCheckResult.vehicleCategory;
                            const isMismatch = registeredType !== vehicleType;
                            return (
                                <div className={`vehicle-mismatch-banner ${isMismatch ? 'mismatch' : ''}`}>
                                    <span className="material-symbols-outlined mismatch-icon">
                                        {isMismatch ? 'warning' : 'check_circle'}
                                    </span>
                                    <div className="mismatch-text">
                                        <span>Biển số </span>
                                        <strong className="mismatch-plate">{preCheckResult.plateNumber}</strong>
                                        <span> đã đăng ký là </span>
                                        <strong className={`mismatch-registered-type ${isMismatch ? 'text-invalid' : 'text-valid'}`}>
                                            {registeredType}
                                        </strong>
                                        {isMismatch && (
                                            <span className="text-invalid"> — không khớp!</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {mode === 'IN' && preCheckResult && preCheckResult.vehicleType === 'VISITOR' && (
                            <div className="visitor-card-select-container">
                                <label className="transaction-label">Chọn thẻ lượt:</label>
                                <select
                                    value={selectedCard}
                                    onChange={(e) => setSelectedCard(e.target.value)}
                                >
                                    <option value="">-- Chọn thẻ lượt --</option>
                                    {preCheckResult.availableCards?.map(c => (
                                        <option key={c.card_id} value={c.code}>{c.code}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Operator Quick Guide */}
                        <div className="operator-guide-box">
                            <div className="guide-title">
                                <span className="material-symbols-outlined">info</span>
                                <span>Quy trình vận hành</span>
                            </div>
                            <ul className="guide-steps">
                                <li>1. Nhập biển số (hoặc click Camera quét ảnh)</li>
                                <li>2. Kiểm tra thông tin thẻ xe ở bảng bên phải</li>
                                <li>3. Ấn ENTER hoặc click nút bên dưới để mở barie</li>
                            </ul>
                        </div>

                        <button
                            type="submit"
                            className="shortcut-button shortcut-primary submit-action-btn"
                            disabled={
                                loading ||
                                (mode === 'IN' && preCheckResult?.vehicleType === 'MONTHLY' && preCheckResult?.canOpenGate === false) ||
                                (mode === 'IN' && preCheckResult?.vehicleType === 'MONTHLY' && preCheckResult?.vehicleCategory && preCheckResult.vehicleCategory !== vehicleType)
                            }
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined loading-spin">hourglass_top</span>
                                    Đang xử lý...
                                </>
                            ) : !preCheckResult ? (
                                mode === 'IN' ? (
                                    <>
                                        <span className="material-symbols-outlined">search</span>
                                        Kiểm tra xe vào
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">search</span>
                                        Kiểm tra xe ra
                                    </>
                                )
                            ) : mode === 'IN' ? (
                                preCheckResult.vehicleType === 'VISITOR' ? (
                                    <>
                                        <span className="material-symbols-outlined">tap_and_play</span>
                                        Xác nhận vào
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">sensor_door</span>
                                        Mở cổng vào
                                    </>
                                )
                            ) : (
                                preCheckResult.vehicleType === 'VISITOR' ? (
                                    <>
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Xác nhận ra
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">sensor_door</span>
                                        Mở cổng ra
                                    </>
                                )
                            )}
                        </button>
                        {/* Shift Information Card */}
                        <div className="shift-info-card">
                            <div className="shift-title">
                                <span className="material-symbols-outlined">badge</span>
                                <span>Thông tin ca trực</span>
                            </div>
                            <div className="shift-grid">
                                <div className="shift-item">
                                    <span className="shift-label">Nhân viên</span>
                                    <span className="shift-value">{user?.email || 'staff@gmail.com'}</span>
                                </div>
                                <div className="shift-item">
                                    <span className="shift-label">Thời gian</span>
                                    <span className="shift-value">{currentTime.toLocaleTimeString('vi-VN')}</span>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="transaction-details">
                        {preCheckResult ? (
                            <div className="last-session-card">
                                <h4 className="last-session-title">
                                    <span className="material-symbols-outlined">badge</span>
                                    <span>Thông tin quét thẻ</span>
                                </h4>
                                <div className="last-session-grid">
                                    <div className="last-session-item">
                                        <span className="last-session-label">Chủ xe:</span>
                                        <strong className="last-session-value">
                                            {preCheckResult.vehicleType === 'MONTHLY' ? preCheckResult.ownerName : 'Khách vãng lai'}
                                        </strong>
                                    </div>
                                    <div className="last-session-item">
                                        <span className="last-session-label">Loại thẻ:</span>
                                        <strong className="last-session-value">
                                            {preCheckResult.vehicleType === 'MONTHLY' ? 'Vé tháng' : 'Vé lượt'}
                                        </strong>
                                    </div>
                                    <div className="last-session-item">
                                        <span className="last-session-label">Mã thẻ:</span>
                                        <strong className="last-session-value">
                                            {preCheckResult.cardCode || selectedCard || '---'}
                                        </strong>
                                    </div>

                                    {mode === 'IN' ? (
                                        <>
                                            <div className="last-session-item">
                                                <span className="last-session-label">Biển số đăng ký:</span>
                                                <strong className="last-session-value">
                                                    {preCheckResult.vehicleType === 'MONTHLY' ? preCheckResult.plateNumber : 'Vé lượt'}
                                                </strong>
                                            </div>
                                            {preCheckResult.vehicleType === 'MONTHLY' && (
                                                <div className="last-session-item full-width" style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                                                    <span className="last-session-label">Hạn thẻ:</span>
                                                    <strong className="last-session-value" style={{ color: preCheckResult.canOpenGate ? '#16a34a' : '#dc2626' }}>
                                                        {preCheckResult.validUntil ? new Date(preCheckResult.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                                    </strong>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="last-session-item">
                                                <span className="last-session-label">Biển số vào:</span>
                                                <strong className="last-session-value">{preCheckResult.plateNumber || '---'}</strong>
                                            </div>
                                            <div className="last-session-item">
                                                <span className="last-session-label">Biển số ra:</span>
                                                <strong className="last-session-value" style={{ color: '#1e3a8a' }}>{plateNumber || '---'}</strong>
                                            </div>
                                            <div className="last-session-item full-width" style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                                                <span className="last-session-label">Giờ vào:</span>
                                                <strong className="last-session-value">
                                                    {preCheckResult.entryTime ? (new Date(preCheckResult.entryTime).toString() === 'Invalid Date' ? preCheckResult.entryTime : new Date(preCheckResult.entryTime).toLocaleString('vi-VN')) : '---'}
                                                </strong>
                                            </div>
                                            <div className="last-session-item full-width">
                                                <span className="last-session-label">Thời gian gửi:</span>
                                                <strong className="last-session-value">{preCheckResult.duration || '---'}</strong>
                                            </div>
                                            <div className="last-session-item full-width" style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                                                <span className="last-session-label">Phí giữ xe:</span>
                                                <strong className="last-session-value" style={{ fontSize: '13px', color: preCheckResult.fee > 0 ? '#dc2626' : '#16a34a' }}>
                                                    {preCheckResult.fee?.toLocaleString('vi-VN')} VNĐ
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {preCheckResult.message && (
                                    <div style={{
                                        marginTop: '6px',
                                        padding: '4px 8px',
                                        background: preCheckResult.canOpenGate ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${preCheckResult.canOpenGate ? '#bbf7d0' : '#fecaca'}`,
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        color: preCheckResult.canOpenGate ? '#15803d' : '#b91c1c',
                                        fontWeight: '500'
                                    }}>
                                        * {preCheckResult.message}
                                    </div>
                                )}
                            </div>
                        ) : lastSession ? (
                            <div className="last-session-card">
                                <h4 className="last-session-title">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span>Giao dịch vừa thực hiện</span>
                                </h4>
                                <div className="last-session-grid">
                                    <div className="last-session-item">
                                        <span className="last-session-label">Biển số:</span>
                                        <strong className="last-session-value">{lastSession.plate_number}</strong>
                                    </div>
                                    <div className="last-session-item">
                                        <span className="last-session-label">Trạng thái:</span>
                                        <strong className="last-session-value status-done">
                                            {(lastSession.status === 'Đang gửi xe') ? 'ĐANG GỬI' :
                                             (lastSession.status === 'Hoàn thành') ? 'HOÀN THÀNH' : lastSession.status}
                                        </strong>
                                    </div>
                                    <div className="last-session-item full-width">
                                        <span className="last-session-label">Giờ vào:</span>
                                        <strong className="last-session-value">{new Date(lastSession.entry_time).toLocaleString('vi-VN')}</strong>
                                    </div>
                                    {lastSession.type === 'OUT' && (
                                        <>
                                            <div className="last-session-item full-width">
                                                <span className="last-session-label">Giờ ra:</span>
                                                <strong className="last-session-value">{new Date(lastSession.exit_time).toLocaleString('vi-VN')}</strong>
                                            </div>
                                            <div className="last-session-item full-width highlight-row">
                                                <span className="last-session-label">Giá tiền:</span>
                                                <strong className="last-session-value price-value">
                                                    {lastSession.fee ? lastSession.fee.toLocaleString('vi-VN') : '0'} VNĐ
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="last-session-card">
                                <h4 className="last-session-title">
                                    <span className="material-symbols-outlined">pending</span>
                                    <span>Thông tin phiên hoạt động</span>
                                </h4>
                                <div className="last-session-grid">
                                    <div className="last-session-item">
                                        <span className="last-session-label">Giờ vào:</span>
                                        <strong className="last-session-value">-- : --</strong>
                                    </div>
                                    <div className="last-session-item">
                                        <span className="last-session-label">Giờ ra:</span>
                                        <strong className="last-session-value">-- : --</strong>
                                    </div>
                                    <div className="last-session-item full-width">
                                        <span className="last-session-label">Giá tiền:</span>
                                        <strong className="last-session-value">-- VNĐ</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Transactions Card */}
                        <div className="recent-transactions-list-card">
                             <div className="recent-title">
                                 <span className="material-symbols-outlined">history</span>
                                 <span>Giao dịch gần đây</span>
                             </div>
                             <div className="recent-items-container">
                                 {recentSessions.length > 0 ? (
                                     recentSessions.map((s, idx) => {
                                         const isOut = !!s.exit_time;
                                         const timeStr = new Date(isOut ? s.exit_time : s.entry_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                         return (
                                             <div className="recent-item" key={s.session_id || idx}>
                                                 <div className="recent-item-left">
                                                     <span className={`recent-badge ${isOut ? 'badge-out' : 'badge-in'}`}>
                                                         {isOut ? 'RA' : 'VÀO'}
                                                     </span>
                                                     <span className="recent-plate">{s.plate_number}</span>
                                                 </div>
                                                 <div className="recent-item-right">
                                                     <span className="recent-time">{timeStr}</span>
                                                     <span className="recent-fee">{isOut ? `${s.fee ? s.fee.toLocaleString('vi-VN') : '0'}đ` : 'Đang gửi'}</span>
                                                 </div>
                                             </div>
                                         );
                                     })
                                 ) : (
                                     <div className="recent-empty">Chưa có giao dịch nào trong ngày.</div>
                                 )}
                             </div>
                         </div>

                        {/* System Hardware Status */}
                        <div className="system-status-card">
                            <div className="status-title">
                                <span className="material-symbols-outlined">settings_ethernet</span>
                                <span>Kết nối thiết bị</span>
                            </div>
                            <div className="status-grid">
                                <div className="status-item">
                                    <span className="status-dot online"></span>
                                    <span className="status-name">Camera LPR IN</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-dot online"></span>
                                    <span className="status-name">Camera LPR OUT</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-dot online"></span>
                                    <span className="status-name">Barrier IN</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-dot online"></span>
                                    <span className="status-name">Barrier OUT</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="shortcut-row">
                    {actionShortcuts.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            className={action.primary ? 'shortcut-button shortcut-primary' : 'shortcut-button'}

                            onClick={() => {

                                if (action.label === 'F1') {
                                    navigate("/login/dashboard/OccupancyChart");
                                    return;
                                }
                                if (action.label === 'F2') {
                                    navigate('/login/dashboard/lost-card-log');
                                    return;
                                }

                                if (action.label === 'ENTER') {
                                    if (mode === 'IN') {
                                        handleCheckInSubmit();
                                    } else {
                                        handleCheckOutSubmit();
                                    }
                                }
                            }}
                            disabled={loading}
                        >
                            <span className="shortcut-key">{action.label}</span>
                            <span>{action.text}</span>
                        </button>
                    ))}
                </section>
            </main>

            <footer className="system-footer">
                <p>© 2024 Hệ thống Quản lý Tòa nhà & Bãi xe. Toàn bộ bản quyền được bảo lưu.</p>
                <div className="footer-links">
                    <a href="#">Chính sách Bảo mật</a>
                    <a href="#">Hỗ trợ</a>
                    <a href="#">Trạng thái Hệ thống</a>
                </div>
            </footer>

            {/* Entry Simulator Modal */}
            {
                showEntryModal && preCheckResult && (
                    <div className="op-modal-overlay">
                        <div className="op-modal-content">
                            <div className="op-modal-header">
                                <h3 className="op-modal-title">
                                    <span className={`material-symbols-outlined op-modal-title-icon ${preCheckResult.vehicleType === 'MONTHLY' ? 'icon-monthly' : 'icon-visitor'}`}>
                                        {preCheckResult.vehicleType === 'MONTHLY' ? 'verified' : 'style'}
                                    </span>
                                    {preCheckResult.vehicleType === 'MONTHLY' ? 'Thông tin Xe tháng' : 'Chọn thẻ xe vãng lai'}
                                </h3>
                                <button
                                    onClick={() => setShowEntryModal(false)}
                                    className="op-modal-close-btn"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {preCheckResult.vehicleType === 'MONTHLY' ? (
                                <div>
                                    <div className="op-modal-details">
                                        <div className="op-modal-detail-row">
                                            <span className="op-modal-detail-label">Biển số xe:</span>
                                            <strong className="op-modal-detail-value value-large">{preCheckResult.plateNumber}</strong>
                                        </div>
                                        <div className="op-modal-detail-row">
                                            <span className="op-modal-detail-label">Chủ xe:</span>
                                            <strong className="op-modal-detail-value">{preCheckResult.ownerName}</strong>
                                        </div>
                                        <div className="op-modal-detail-row">
                                            <span className="op-modal-detail-label">Mã thẻ:</span>
                                            <strong className="op-modal-detail-value">{preCheckResult.cardCode}</strong>
                                        </div>
                                        <div className="op-modal-detail-row">
                                            <span className="op-modal-detail-label">Hạn thẻ:</span>
                                            <strong className="op-modal-detail-value">{preCheckResult.validUntil ? new Date(preCheckResult.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong>
                                        </div>
                                        <div className="op-modal-detail-row highlight-row no-border">
                                            <span className="op-modal-detail-label">Trạng thái cước:</span>
                                            <strong className={`op-modal-detail-value ${preCheckResult.canOpenGate ? 'fee-monthly' : 'text-invalid'}`}>
                                                {preCheckResult.canOpenGate ? 'Hợp lệ' : 'Không hợp lệ'}
                                            </strong>
                                        </div>
                                    </div>

                                    {preCheckResult.message && (
                                        <div className="op-modal-alert-box">
                                            * {preCheckResult.message}
                                        </div>
                                    )}

                                    <div className="op-modal-actions">
                                        <button
                                            onClick={() => setShowEntryModal(false)}
                                            className="cardpage-button secondary op-modal-btn"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setShowEntryModal(false);
                                                await handleCheckInSubmit();
                                            }}
                                            disabled={preCheckResult.canOpenGate === false}
                                            className="cardpage-button primary op-modal-btn"
                                        >
                                            Xác nhận mở cổng
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="lost-action-hint" style={{ marginBottom: '16px', color: '#64748b' }}>
                                        Biển số vào: <strong>{preCheckResult.plateNumber}</strong>. Vui lòng chọn 1 trong 3 thẻ lượt khả dụng bên dưới:
                                    </p>

                                    <div className="op-card-grid">
                                        {preCheckResult.availableCards?.slice(0, 3).map((card) => {
                                            const isSelected = selectedCard === card.code;
                                            return (
                                                <div
                                                    key={card.card_id}
                                                    onClick={() => setSelectedCard(card.code)}
                                                    className={`op-card-item ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <span className="material-symbols-outlined op-card-icon">
                                                        credit_card
                                                    </span>
                                                    <div className="op-card-code">
                                                        {card.code}
                                                    </div>
                                                    <div className="op-card-meta">
                                                        Thẻ lượt
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!preCheckResult.availableCards || preCheckResult.availableCards.length === 0) && (
                                            <div className="op-card-empty-state">
                                                Không có thẻ lượt nào trống trong hệ thống!
                                            </div>
                                        )}
                                    </div>

                                    <div className="op-modal-actions">
                                        <button
                                            onClick={() => setShowEntryModal(false)}
                                            className="cardpage-button secondary op-modal-btn"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!selectedCard) {
                                                    showToast('Vui lòng chọn 1 thẻ lượt.', 'error');
                                                    return;
                                                }
                                                setShowEntryModal(false);
                                                await handleCheckInSubmit();
                                            }}
                                            disabled={!selectedCard}
                                            className="cardpage-button primary op-modal-btn"
                                        >
                                            Xác nhận vào
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Exit Simulator Modal */}
            {
                showExitModal && preCheckResult && (
                    <div className="op-modal-overlay">
                        <div className="op-modal-content">
                            <div className="op-modal-header">
                                <h3 className="op-modal-title">
                                    <span className={`material-symbols-outlined op-modal-title-icon ${preCheckResult.vehicleType === 'MONTHLY' ? 'icon-monthly' : 'icon-visitor'}`}>
                                        sensor_door
                                    </span>
                                    {preCheckResult.vehicleType === 'MONTHLY' ? 'Thông tin Xe tháng ra' : 'Xác nhận xe vãng lai ra'}
                                </h3>
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    className="op-modal-close-btn"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div>
                                <div className="op-modal-details">
                                    <div className="op-modal-detail-row">
                                        <span className="op-modal-detail-label">Biển số xe:</span>
                                        <strong className="op-modal-detail-value value-large">{plateNumber}</strong>
                                    </div>
                                    <div className="op-modal-detail-row">
                                        <span className="op-modal-detail-label">Mã thẻ:</span>
                                        <strong className="op-modal-detail-value">{preCheckResult.cardCode}</strong>
                                    </div>
                                    <div className="op-modal-detail-row">
                                        <span className="op-modal-detail-label">Giờ vào:</span>
                                        <strong className="op-modal-detail-value">{preCheckResult.entryTime}</strong>
                                    </div>
                                    <div className="op-modal-detail-row">
                                        <span className="op-modal-detail-label">Thời gian gửi:</span>
                                        <strong className="op-modal-detail-value">{preCheckResult.duration}</strong>
                                    </div>
                                    <div className="op-modal-detail-row highlight-row no-border">
                                        <span className="op-modal-detail-label label-bold">Phí thanh toán:</span>
                                        <strong className={`op-modal-detail-value ${preCheckResult.vehicleType === 'MONTHLY' ? 'fee-monthly' : 'fee-visitor'}`}>
                                            {preCheckResult.fee?.toLocaleString('vi-VN')} VNĐ
                                        </strong>
                                    </div>
                                </div>

                                <div className="op-modal-actions">
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="cardpage-button secondary op-modal-btn"
                                    >
                                        Hủy
                                    </button>
                                    {preCheckResult.vehicleType === 'VISITOR' && preCheckResult.fee > 0 && (
                                        <button
                                            onClick={async () => {
                                                setShowExitModal(false);
                                                await handleVnpayCheckout();
                                            }}
                                            className="cardpage-button primary op-modal-btn btn-vnpay"
                                        >
                                            Thanh toán VNPAY
                                        </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            setShowExitModal(false);
                                            await handleCheckOutSubmit();
                                        }}
                                        className="cardpage-button primary op-modal-btn"
                                    >
                                        {preCheckResult.vehicleType === 'MONTHLY' ? 'Mở cổng ra' : 'Xác nhận ra'}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }

        </div >
    );
}
