import { useState, useRef } from 'react';
import { checkInParking, checkOutParking } from '../../../service/parkingApi';

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
    { label: 'F2', text: 'Tìm kiếm', primary: false },
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

    // ── Check-Out State ──────────────────────────────────────────────────────
    const [exitVehicleImage, setExitVehicleImage] = useState(null);
    const [exitPlateImage, setExitPlateImage] = useState(null);
    const [exitVehiclePreview, setExitVehiclePreview] = useState(null);
    const [exitPlatePreview, setExitPlatePreview] = useState(null);

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

    // ── Helpers ──────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    const resetInForm = () => {
        setPlateNumber('');
        setVehicleImage(null);
        setPlateImage(null);
        setVehiclePreview(null);
        setPlatePreview(null);
    };

    const resetOutForm = () => {
        setPlateNumber('');
        setExitVehicleImage(null);
        setExitPlateImage(null);
        setExitVehiclePreview(null);
        setExitPlatePreview(null);
    };

    const handleCameraClick = (id) => {
        if (mode === 'IN') {
            if (id === 'vehicleImage') {
                vehicleInputRef.current?.click();
            } else if (id === 'plateImage') {
                plateInputRef.current?.click();
            }
        } else {
            if (id === 'camera3') {
                exitVehicleInputRef.current?.click();
            } else if (id === 'camera4') {
                exitPlateInputRef.current?.click();
            }
        }
    };

    const handleCheckInSubmit = async () => {
        if (!plateNumber.trim()) {
            showToast('Vui lòng nhập biển số xe.', 'error');
            return;
        }
        if (!vehicleImage) {
            showToast('Vui lòng click Camera 01 để chọn ảnh xe vào.', 'error');
            return;
        }
        if (!plateImage) {
            showToast('Vui lòng click Camera 02 để chọn ảnh biển số vào.', 'error');
            return;
        }

        try {
            setLoading(true);
            const result = await checkInParking(
                plateNumber.trim().toUpperCase(),
                vehicleImage,
                plateImage
            );

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
            const msg =
                err?.response?.data?.message ||
                err.message ||
                'Đã xảy ra lỗi khi check in.';
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
        if (!exitVehicleImage) {
            showToast('Vui lòng click Camera 03 để chọn ảnh xe ra.', 'error');
            return;
        }
        if (!exitPlateImage) {
            showToast('Vui lòng click Camera 04 để chọn ảnh biển số ra.', 'error');
            return;
        }

        try {
            setLoading(true);
            const result = await checkOutParking(
                plateNumber.trim().toUpperCase(),
                exitVehicleImage,
                exitPlateImage
            );

            if (result.success) {
                showToast(result.message || 'Check out thành công!', 'success');
                setLastSession({
                    ...result.session,
                    fee: result.fee,
                    type: 'OUT'
                });
                resetOutForm();
            } else {
                showToast(result.message || 'Check out thất bại.', 'error');
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err.message ||
                'Đã xảy ra lỗi khi check out.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (mode === 'IN') {
            handleCheckInSubmit();
        } else {
            handleCheckOutSubmit();
        }
    };

    return (
        <div className="system-page">
            {/* Hidden File Inputs for uploads */}
            <input
                type="file"
                ref={vehicleInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setVehicleImage(file);
                        setVehiclePreview(URL.createObjectURL(file));
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={plateInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setPlateImage(file);
                        setPlatePreview(URL.createObjectURL(file));
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={exitVehicleInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setExitVehicleImage(file);
                        setExitVehiclePreview(URL.createObjectURL(file));
                    }
                }}
                accept="image/*"
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={exitPlateInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setExitPlateImage(file);
                        setExitPlatePreview(URL.createObjectURL(file));
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
                    {cameraCards.map((camera) => {
                        const isCameraIn = camera.id === 'vehicleImage' || camera.id === 'plateImage';
                        const isCameraOut = camera.id === 'camera3' || camera.id === 'camera4';
                        const isActiveMode = (mode === 'IN' && isCameraIn) || (mode === 'OUT' && isCameraOut);
                        
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
                            <article key={camera.title} className="camera-card" style={{ opacity: isActiveMode ? 1 : 0.45, transition: 'opacity 0.25s ease' }}>
                                <div
                                    className="camera-image"
                                    style={{
                                        backgroundImage: `url(${bgImage})`,
                                        cursor: isActiveMode ? 'pointer' : 'not-allowed'
                                    }}
                                    onClick={() => isActiveMode && handleCameraClick(camera.id)}
                                    onMouseEnter={() => isActiveMode && setHoveredCamera(camera.id)}
                                    onMouseLeave={() => isActiveMode && setHoveredCamera(null)}
                                >
                                    <span className="camera-label">{camera.title}</span>
                                    {camera.badge && <span className={`camera-badge ${camera.badgeClass}`}>{camera.badge}</span>}
                                    
                                    {/* Overlay showing upload message on hover */}
                                    {isActiveMode && (
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
                                    )}

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
                                background: mode === 'IN' ? '#fb923c' : '#f3f4f6',
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
                                background: mode === 'OUT' ? '#fb923c' : '#f3f4f6',
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
                                border: '2px dashed #fb923c',
                                outline: 'none',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                cursor: 'text'
                            }}
                        />
                        <button
                            type="submit"
                            className="shortcut-button shortcut-primary"
                            disabled={loading}
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
                            ) : mode === 'IN' ? (
                                <>
                                    <span className="material-symbols-outlined">login</span>
                                    Check-In Xe Vào
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">logout</span>
                                    Check-Out Xe Ra
                                </>
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
                                        {lastSession.status === 'PARKING' ? 'ĐANG GỬI' : 
                                         lastSession.status === 'COMPLETED' ? 'HOÀN THÀNH' : lastSession.status}
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

            {/* Toast notifications */}
            {toast.show && (
                <div className={`custom-toast ${toast.type}`} style={{ zIndex: 9999 }}>
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="toast-text">{toast.message}</span>
                </div>
            )}
        </div>
    )
}