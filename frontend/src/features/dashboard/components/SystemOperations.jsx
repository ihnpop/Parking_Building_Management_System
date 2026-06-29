import { useState, useRef, useEffect } from 'react';
import {
    uploadGateFile,
    simulateOcrFile,
    preCheckEntryGate,
    entryGate,
    preCheckExitGate,
    exitGate
} from '../../../service/parkingApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../config/supabaseClient';

const cameraCards = [
    {
        id: 'vehicleImage',
        title: 'Camera 01 - Toàn cảnh IN',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDM7hJvEzwj5N8Ecltn_8mNmwCmHC40GPQLUzrPpYJ3Tljm187mQfYN7L2m5AQPX-Z23j1SiukOmWd5mZYS3zwDxGw4zGLe-aLWV6n3yP73FpIXiraqm_cL0Bsy4dN7KpnJQ1SWrczGDUq8JFEQfBzQSLPHpZbEVZyMlaP9VA75RK12SP-5oXHNPf5wNWvnd6Ni7pD_m5VR7e0bfHXaTvRnvwsnV7yzY92x1E-qo4kdpJp473Clxs7tzSKXNTz_tDSx953gGoukxvk',
        badge: 'REC',
        badgeClass: 'camera-badge-record',
    },
    {
        id: 'plateImage',
        title: 'Camera 02 - Biển số IN',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBY_qQ9w1hTwomzRMVxQ_cRALiO7poUpyGH1d3L0BBc0z08g2A6uhN9AdQexl9JYb6VtLi2iuOqTbW3DSJotPZxrJllI0aHC5CPNpLQTmD8UIekVaSmP79O8332EpfIlwC1L22wcXGMvEmYrBRIGbaGtSZGflODD7zMesEs_nUSi8ncvTapJXU9_ntgQdVTCK2CposjUZXTOC40qJ4OMb_eccDmW7JE2u59YBJxOp_x_Mz97TbHeh_hwM1Oczzwci2Qmyhd0XFTHno',
    },
    {
        id: 'camera3',
        title: 'Camera 03 - Toàn cảnh OUT',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB1utp_U-WKcOZcqCWl6rsHwW8kbASOtTw-vaMhAXERRCZZJm_e2ID2rxbr2zJLynsq0_FL_FHGiGQmxl4wHqA-Ucn3socPr0SK3g0C3yYR-j52-rjoyYe-upJtUXBGHJGLzvuf9l21-GFQ76XBhf1upX4OhAneef7Rg9UdMz0PGryoBCMISIAEhfFc-2N_FjpDI85Rap0ZWoZ69pV5DFYw45Zoq0Ia3er1pH-lQsAxdBPLMIBktImLUiGSL-80wfLmNrtgzTlA-jw',
    },
    {
        id: 'camera4',
        title: 'Camera 04 - Biển số OUT',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDJCOcqayYGfaWqXDR4TjBRcDUAGQyuvhkTCQ3r2Ivprb_szJonOqtBHW-ICNPYfFv97j3bVpHhH-WnSA4aS2MCIYAuo40ZbNe02ndW35ycuxzb_SF9PEYBs5oL0UVMatcLg6wI6fohgpgo1GWmXT4eX2ujtuTCWlPYYZBc88zmIKNCnhQ8mGiDg5muXtxL4-loBashck6sklVinfS5HN2mCsxrgS2gT725B0SaQ6_FovbCcTfINamNS7eRSyYTR8rsROnXGYm3pdU',
    },
]


const actionShortcuts = [
    { label: 'F1', text: 'Thống kê', primary: false },
    { label: 'F2', text: 'Báo Cáo', primary: false },
    { label: 'ENTER', text: 'Xác nhận', primary: true },
]


export default function SystemOperations() {
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

    // ── UI States ────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [hoveredCamera, setHoveredCamera] = useState(null);
    const [lastSession, setLastSession] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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
                    setToast({
                        show: true,
                        message: 'Tài khoản của bạn chưa được phân công tòa nhà. Không thể thực hiện Check-in/Check-out.',
                        type: 'error'
                    });
                }
            } catch (err) {
                console.error("Error checking building assignment:", err);
            }
        };
        checkBuildingAssignment();
    }, [user]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        if (type !== 'error') {
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
        }
    };

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
        setPreCheckResult(null);
        setSelectedCard('');
        setExitVehicleUrl('');
        setExitPlateUrl('');
        setVehicleType('Xe máy');
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
                }
                setShowEntryModal(true);
            } else {
                const res = await preCheckExitGate(plate);
                setPreCheckResult(res);
                setShowExitModal(true);
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

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!plateNumber.trim()) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }
        await handlePreCheck(plateNumber);
    };
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

                if (mode === 'IN') {
                    handleCheckInSubmit();
                } else {
                    handleCheckOutSubmit();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigate, mode]);
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

            {toast.show && (
                <div className="parking-alert-container">
                    <div className={`parking-alert parking-alert-${toast.type}`}>
                        <div className="parking-alert-body">
                            <div className="parking-alert-icon-bg">
                                <span className="material-symbols-outlined">
                                    {toast.type === 'error' ? 'error' : 'check_circle'}
                                </span>
                            </div>
                            <span className="parking-alert-text">{toast.message}</span>
                        </div>
                        <button
                            type="button"
                            className="parking-alert-close"
                            onClick={() => setToast({ show: false, message: '', type: 'success' })}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            )}

            <main className="system-content">
                <section className="stats-grid">
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Số lượng xe trong bãi</p>
                            <p className="stat-value">142</p>
                        </div>
                        <div className="stat-icon stat-icon-primary">
                            <span className="material-symbols-outlined">local_parking</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã vào</p>
                            <p className="stat-value">350</p>
                        </div>
                        <div className="stat-icon stat-icon-secondary">
                            <span className="material-symbols-outlined">login</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã ra</p>
                            <p className="stat-value">208</p>
                        </div>
                        <div className="stat-icon stat-icon-tertiary">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                    </article>
                </section>

                <section className="camera-grid">
                    {[cameraCards[0], cameraCards[1], cameraCards[2], cameraCards[3]].map((camera) => {
                        const isCameraIn = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                        const isCurrentlyActiveMode = (mode === 'IN' && isCameraIn) || (mode === 'OUT' && !isCameraIn);

                        let bgImage = camera.image;
                        let isSelected = false;

                        if (camera.id === 'vehicleImage') {
                            bgImage = vehiclePreview || camera.image;
                            isSelected = !!vehicleImage;
                        } else if (camera.id === 'plateImage') {
                            bgImage = platePreview || camera.image;
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
                                    onClick={() => handleCameraClick(camera.id)}
                                    onMouseEnter={() => setHoveredCamera(camera.id)}
                                    onMouseLeave={() => setHoveredCamera(null)}
                                >
                                    <span className="camera-label">{camera.title}</span>
                                    {camera.badge && <span className={`camera-badge ${camera.badgeClass}`}>{camera.badge}</span>}

                                    {/* Overlay showing upload message on hover */}
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

                                    {/* Selected badge */}
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 12,
                                            left: 12,
                                            background: '#22c55e',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            zIndex: 5
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                            Đã chọn ảnh
                                        </div>
                                    )}
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
                            onClick={() => setMode('IN')}
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
                            XE VÀO (CHECK-IN)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('OUT')}
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
                            XE RA (CHECK-OUT)
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

                        {/* Biểu thị thông tin xe sau khi precheck */}
                        {preCheckResult && (
                            <div style={{ marginTop: '16px', textAlign: 'left' }}>
                                {mode === 'IN' ? (
                                    preCheckResult.vehicleType === 'VISITOR' ? (
                                        <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                                            <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="material-symbols-outlined">directions_car</span>
                                                Visitor Vehicle
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px' }}>
                                                Biển số: <strong style={{ color: '#1d4ed8' }}>{preCheckResult.plateNumber}</strong>
                                            </p>

                                            <div style={{ marginTop: '10px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>Available Cards</label>
                                                <select
                                                    value={selectedCard}
                                                    onChange={(e) => setSelectedCard(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        background: 'white',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        color: '#1e293b',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    <option value="">-- Chọn thẻ lượt --</option>
                                                    {preCheckResult.availableCards?.map(c => (
                                                        <option key={c.card_id} value={c.code}>{c.code}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                            <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="material-symbols-outlined">verified</span>
                                                Monthly Vehicle
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Biển số:</span>
                                                <strong>{preCheckResult.plateNumber}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Chủ xe:</span>
                                                <strong>{preCheckResult.ownerName}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Thẻ đăng ký:</span>
                                                <strong>{preCheckResult.cardCode}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Hạn thẻ:</span>
                                                <strong>{preCheckResult.validUntil ? new Date(preCheckResult.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong>
                                            </p>
                                            <p style={{ margin: '8px 0 4px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #bbf7d0', color: '#1e293b' }}>
                                                <span>Subscription:</span>
                                                <span style={{ color: preCheckResult.canOpenGate ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                                    {preCheckResult.canOpenGate ? 'Valid' : 'Expired/Invalid'}
                                                </span>
                                            </p>
                                            {preCheckResult.message && (
                                                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#dc2626', fontStyle: 'italic', fontWeight: '500' }}>
                                                    * {preCheckResult.message}
                                                </p>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    preCheckResult.vehicleType === 'VISITOR' ? (
                                        <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                                            <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="material-symbols-outlined">exit_to_app</span>
                                                Visitor Vehicle
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Biển số:</span>
                                                <strong>{plateNumber}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Mã thẻ:</span>
                                                <strong>{preCheckResult.cardCode}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Giờ vào:</span>
                                                <strong>{preCheckResult.entryTime}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Thời gian:</span>
                                                <strong>{preCheckResult.duration}</strong>
                                            </p>
                                            <p style={{ margin: '8px 0 4px', fontSize: '15px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', color: '#1e293b' }}>
                                                <span>Phí gửi:</span>
                                                <strong style={{ color: '#1d4ed8', fontSize: '16px' }}>{preCheckResult.fee?.toLocaleString('vi-VN')} VNĐ</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                            <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="material-symbols-outlined">verified</span>
                                                Monthly Vehicle
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Biển số:</span>
                                                <strong>{plateNumber}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Mã thẻ:</span>
                                                <strong>{preCheckResult.cardCode}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Giờ vào:</span>
                                                <strong>{preCheckResult.entryTime}</strong>
                                            </p>
                                            <p style={{ margin: '4px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between', color: '#1e293b' }}>
                                                <span>Thời gian:</span>
                                                <strong>{preCheckResult.duration}</strong>
                                            </p>
                                            <p style={{ margin: '8px 0 4px', fontSize: '15px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #bbf7d0', color: '#1e293b' }}>
                                                <span>Phí gửi:</span>
                                                <strong style={{ color: '#16a34a', fontSize: '16px' }}>0 VNĐ (Miễn phí)</strong>
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* Selector Loại xe */}
                        {true && (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Loại xe:</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setVehicleType('Xe máy')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: vehicleType === 'Xe máy' ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            background: vehicleType === 'Xe máy' ? '#eff6ff' : 'white',
                                            color: vehicleType === 'Xe máy' ? '#1d4ed8' : '#4b5563',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>two_wheeler</span>
                                        Xe máy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVehicleType('Ô tô')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: vehicleType === 'Ô tô' ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            background: vehicleType === 'Ô tô' ? '#eff6ff' : 'white',
                                            color: vehicleType === 'Ô tô' ? '#1d4ed8' : '#4b5563',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>directions_car</span>
                                        Ô tô
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="shortcut-button shortcut-primary"
                            disabled={loading || (mode === 'IN' && preCheckResult?.vehicleType === 'MONTHLY' && preCheckResult?.canOpenGate === false)}
                            style={{
                                width: '100%',
                                marginTop: 12,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 8,
                                minHeight: 44,
                                borderRadius: 12,
                                border: 'none',
                                fontSize: 15,
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>hourglass_top</span>
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
                                        Simulate Tap
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">sensor_door</span>
                                        Open Gate
                                    </>
                                )
                            ) : (
                                preCheckResult.vehicleType === 'VISITOR' ? (
                                    <>
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Confirm Exit
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">sensor_door</span>
                                        Open Exit Gate
                                    </>
                                )
                            )}
                        </button>
                    </form>

                    <div className="transaction-details">
                        {lastSession ? (
                            <>
                                <h4 style={{ margin: '0 0 10px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="material-symbols-outlined">check_circle</span>
                                    Giao dịch vừa thực hiện
                                </h4>
                                <div className="transaction-row">
                                    <div className="transaction-row-label">
                                        <span className="material-symbols-outlined">badge</span>
                                        Biển số:
                                    </div>
                                    <div className="transaction-row-value">{lastSession.plate_number}</div>
                                </div>
                                <div className="transaction-row">
                                    <div className="transaction-row-label">
                                        <span className="material-symbols-outlined">login</span>
                                        Thời gian vào:
                                    </div>
                                    <div className="transaction-row-value">
                                        {new Date(lastSession.entry_time).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                {lastSession.type === 'OUT' && (
                                    <>
                                        <div className="transaction-row">
                                            <div className="transaction-row-label">
                                                <span className="material-symbols-outlined">logout</span>
                                                Thời gian ra:
                                            </div>
                                            <div className="transaction-row-value">
                                                {new Date(lastSession.exit_time).toLocaleString('vi-VN')}
                                            </div>
                                        </div>
                                        <div className="transaction-row transaction-total">
                                            <div className="transaction-row-label">Giá tiền:</div>
                                            <div className="transaction-row-value transaction-price">
                                                {lastSession.fee ? lastSession.fee.toLocaleString('vi-VN') : '0'} VNĐ
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className={lastSession.type === 'OUT' ? "" : "transaction-row transaction-total"}>
                                    <div className="transaction-row-label">Trạng thái:</div>
                                    <div className="transaction-row-value" style={{ color: lastSession.type === 'OUT' ? '#3b82f6' : '#22c55e' }}>
                                        {(lastSession.status === 'Đang gửi xe') ? 'ĐANG GỬI' :
                                            (lastSession.status === 'Hoàn thành') ? 'HOÀN THÀNH' : lastSession.status}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 style={{ margin: '0 0 10px', color: '#4b5563' }}>Thông tin phiên hoạt động</h4>
                                <div className="transaction-row">
                                    <div className="transaction-row-label">
                                        <span className="material-symbols-outlined">login</span>
                                        Thời gian vào:
                                    </div>
                                    <div className="transaction-row-value">-- : --</div>
                                </div>
                                <div className="transaction-row">
                                    <div className="transaction-row-label">
                                        <span className="material-symbols-outlined">logout</span>
                                        Thời gian ra:
                                    </div>
                                    <div className="transaction-row-value">-- : --</div>
                                </div>
                                <div className="transaction-row transaction-total">
                                    <div className="transaction-row-label">Giá tiền:</div>
                                    <div className="transaction-row-value transaction-price">-- VNĐ</div>
                                </div>
                            </>
                        )}
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
                <p>© 2024 Parking Building Management Systems. All rights reserved.</p>
                <div className="footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Support</a>
                    <a href="#">System Status</a>
                </div>
            </footer>

            {/* Entry Simulator Modal */}
            {showEntryModal && preCheckResult && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '480px',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        color: '#1e293b'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: preCheckResult.vehicleType === 'MONTHLY' ? '#16a34a' : '#ea580c' }}>
                                    {preCheckResult.vehicleType === 'MONTHLY' ? 'verified' : 'style'}
                                </span>
                                {preCheckResult.vehicleType === 'MONTHLY' ? 'Thông tin Xe tháng' : 'Chọn thẻ xe vãng lai'}
                            </h3>
                            <button
                                onClick={() => setShowEntryModal(false)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {preCheckResult.vehicleType === 'MONTHLY' ? (
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Biển số xe:</span>
                                        <strong style={{ fontSize: '16px' }}>{preCheckResult.plateNumber}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Chủ xe:</span>
                                        <strong>{preCheckResult.ownerName}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Mã thẻ:</span>
                                        <strong>{preCheckResult.cardCode}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Hạn thẻ:</span>
                                        <strong>{preCheckResult.validUntil ? new Date(preCheckResult.validUntil).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Trạng thái cước:</span>
                                        <strong style={{ color: preCheckResult.canOpenGate ? '#16a34a' : '#dc2626' }}>
                                            {preCheckResult.canOpenGate ? 'Valid (Hợp lệ)' : 'Invalid (Không hợp lệ)'}
                                        </strong>
                                    </div>
                                </div>

                                {preCheckResult.message && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>
                                        * {preCheckResult.message}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowEntryModal(false)}
                                        className="cardpage-button secondary"
                                        style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowEntryModal(false);
                                            await handleCheckInSubmit();
                                        }}
                                        disabled={preCheckResult.canOpenGate === false}
                                        className="cardpage-button primary"
                                        style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        Xác nhận mở cổng
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                                    Biển số vào: <strong>{preCheckResult.plateNumber}</strong>. Vui lòng chọn 1 trong 3 thẻ lượt khả dụng bên dưới:
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                                    {preCheckResult.availableCards?.slice(0, 3).map((card) => {
                                        const isSelected = selectedCard === card.code;
                                        return (
                                            <div
                                                key={card.card_id}
                                                onClick={() => setSelectedCard(card.code)}
                                                style={{
                                                    border: isSelected ? '2px solid #fb923c' : '1px solid #cbd5e1',
                                                    background: isSelected ? '#fff7ed' : '#f8fafc',
                                                    borderRadius: '12px',
                                                    padding: '16px 8px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 4px 6px -1px rgba(251, 146, 60, 0.2)' : 'none'
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: isSelected ? '#fb923c' : '#64748b', marginBottom: '8px' }}>
                                                    credit_card
                                                </span>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: isSelected ? '#ea580c' : '#334155' }}>
                                                    {card.code}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                    Thẻ lượt
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!preCheckResult.availableCards || preCheckResult.availableCards.length === 0) && (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px', color: '#dc2626', background: '#fef2f2', borderRadius: '8px' }}>
                                            Không có thẻ lượt nào trống trong hệ thống!
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowEntryModal(false)}
                                        className="cardpage-button secondary"
                                        style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
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
                                        className="cardpage-button primary"
                                        style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        Simulate Tap
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Exit Simulator Modal */}
            {showExitModal && preCheckResult && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '480px',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        color: '#1e293b'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: preCheckResult.vehicleType === 'MONTHLY' ? '#16a34a' : '#ea580c' }}>
                                    sensor_door
                                </span>
                                {preCheckResult.vehicleType === 'MONTHLY' ? 'Thông tin Xe tháng ra' : 'Xác nhận xe vãng lai ra'}
                            </h3>
                            <button
                                onClick={() => setShowExitModal(false)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Biển số xe:</span>
                                    <strong style={{ fontSize: '16px' }}>{plateNumber}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Mã thẻ:</span>
                                    <strong>{preCheckResult.cardCode}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Giờ vào:</span>
                                    <strong>{preCheckResult.entryTime}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Thời gian gửi:</span>
                                    <strong>{preCheckResult.duration}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 'bold' }}>Phí thanh toán:</span>
                                    <strong style={{
                                        color: preCheckResult.vehicleType === 'MONTHLY' ? '#16a34a' : '#ea580c',
                                        fontSize: '18px'
                                    }}>
                                        {preCheckResult.fee?.toLocaleString('vi-VN')} VNĐ
                                    </strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    className="cardpage-button secondary"
                                    style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowExitModal(false);
                                        await handleCheckOutSubmit();
                                    }}
                                    className="cardpage-button primary"
                                    style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    {preCheckResult.vehicleType === 'MONTHLY' ? 'Open Exit Gate' : 'Confirm Exit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
