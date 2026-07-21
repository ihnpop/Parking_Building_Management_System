import React, { useState, useEffect } from 'react';
import axios from 'axios';
import supabase from '../../../config/supabaseClient';

const API = import.meta.env.VITE_API_URL;

export default function CreateMonthCardDialog({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [codeLoading, setCodeLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // ── Bước 1: eKYC ──────────────────────────────────────────────
    const [frontImg, setFrontImg] = useState(null);
    const [backImg, setBackImg] = useState(null);
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifying, setVerifying] = useState(false);

    // ── Metadata ──────────────────────────────────────────────────
    const DEFAULT_VEHICLE_TYPES = [
        { vehicle_type_id: '439d3c41-838a-4aba-bd05-ff91f7dd6127', name: 'Ô tô' },
        { vehicle_type_id: '7a2fa08c-7d47-4b0d-96be-557daadd3641', name: 'Xe máy' }
    ];
    const [vehicleTypes, setVehicleTypes] = useState(DEFAULT_VEHICLE_TYPES);
    const [packages, setPackages] = useState([]);

    // ── Form data ──────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '',
        vehicle_type_id: '',
        plate_number: '',
        brand: '',
        color: '',
        package_id: '',
        card_code: '',
        cccd_number: '' // Số CCCD/CMND (tự động điền sau khi eKYC thành công hoặc nhập tay)
    });

    const [contractAccepted, setContractAccepted] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('vnpay');
    const [paymentStatus, setPaymentStatus] = useState(null); // null | 'pending' | 'paid' | 'failed'
    const [paymentOrderCode, setPaymentOrderCode] = useState(null);
    const [vehiclePackageId, setVehiclePackageId] = useState(null);
    const [initiating, setInitiating] = useState(false);
    const [checking, setChecking] = useState(false);
    const [payUrl, setPayUrl] = useState(null);

    // ── Reset khi đóng/mở dialog & Tải danh mục loại xe, gói cước ─────
    useEffect(() => {
        if (isOpen) {
            resetAll();
            const fetchMetadataAndCheckPending = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    // 1. Tải danh sách nhóm xe (vehicleTypes)
                    let types = [];
                    try {
                        const resType = await axios.get(`${API}/month-card/vehicle-types`, { headers });
                        const rawTypes = resType.data?.data || resType.data;
                        if (Array.isArray(rawTypes) && rawTypes.length > 0) {
                            types = rawTypes;
                        }
                    } catch (err) {
                        console.warn('Lỗi gọi API vehicle-types, chuyển sang đọc trực tiếp từ Supabase:', err.message);
                    }

                    // Fallback 1: Lấy trực tiếp từ bảng vehicle_type trong Supabase nếu API không trả về
                    if (!types || types.length === 0) {
                        const { data: supaTypes } = await supabase
                            .from('vehicle_type')
                            .select('vehicle_type_id, name')
                            .order('name', { ascending: true });
                        if (supaTypes && supaTypes.length > 0) {
                            types = supaTypes;
                        }
                    }

                    // Fallback 2: Sử dụng danh sách nhóm xe mặc định từ DB nếu cả 2 phương thức trên đều trống
                    if (!types || types.length === 0) {
                        types = DEFAULT_VEHICLE_TYPES;
                    }
                    setVehicleTypes(types);

                    // 2. Tải danh sách gói cước tháng (packages)
                    let pkgs = [];
                    try {
                        const resPkg = await axios.get(`${API}/month-card/packages`, { headers });
                        const rawPkgs = resPkg.data?.data || resPkg.data;
                        if (Array.isArray(rawPkgs) && rawPkgs.length > 0) {
                            pkgs = rawPkgs;
                        }
                    } catch (err) {
                        console.warn('Lỗi gọi API packages, chuyển sang đọc trực tiếp từ Supabase:', err.message);
                    }

                    // Fallback: Lấy trực tiếp từ bảng package trong Supabase nếu API không trả về
                    if (!pkgs || pkgs.length === 0) {
                        const { data: supaPkgs } = await supabase
                            .from('package')
                            .select('*')
                            .eq('status', 'Hoạt động')
                            .order('vehicle_type_id');
                        if (supaPkgs && supaPkgs.length > 0) {
                            pkgs = supaPkgs;
                        }
                    }
                    setPackages(pkgs);

                    // 3. Đã tắt tự động khôi phục giao dịch chờ thanh toán khi mở Modal.
                    // Giúp người dùng có thể tạo đăng ký thẻ tháng mới ngay lập tức từ Bước 1
                    // mà không bị chặn bởi các giao dịch cũ chọn "Để sau".
                    // Các giao dịch "Chờ thanh toán" sẽ được xử lý riêng tại tab "Nhật ký thẻ tháng".
                } catch (err) {
                    console.error('Lỗi tải danh mục đăng ký vé tháng:', err);
                }
            };
            fetchMetadataAndCheckPending();
        }
    }, [isOpen]);

    // ── Tự động sinh mã thẻ ở Bước 5 ────────────────────────────
    useEffect(() => {
        if (step === 5 && !formData.card_code) {
            const fetchCode = async () => {
                setCodeLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${API}/month-card/next-code`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data?.code) setFormData(prev => ({ ...prev, card_code: res.data.code }));
                } catch (err) {
                    setError(err.response?.data?.error || 'Hệ thống đạt giới hạn 50 thẻ tháng.');
                } finally {
                    setCodeLoading(false);
                }
            };
            fetchCode();
        }
    }, [step]);

    const resetAll = () => {
        setStep(1); setError(null); setSuccessMessage('');
        setFrontImg(null); setBackImg(null); setFrontPreview(null); setBackPreview(null);
        setVerifyResult(null); setVerifying(false);
        setContractAccepted(false); setPaymentMethod('vnpay');
        setPaymentStatus(null); setPaymentOrderCode(null); setVehiclePackageId(null);
        setInitiating(false); setChecking(false); setPayUrl(null);
        setFormData({
            full_name: '',
            phone: '',
            email: '',
            vehicle_type_id: '',
            plate_number: '',
            brand: '',
            color: '',
            package_id: '',
            card_code: '',
            cccd_number: '' // Reset thông tin CCCD
        });
    };

    // ── Kiểm tra và khôi phục giao dịch chờ thanh toán ─────────────
    const checkPendingRegistration = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API}/month-card/pending-registration`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success && res.data.pending) {
                const pending = res.data.pending;

                // Bỏ qua nếu orderCode này đã được hoàn tất đăng ký trước đó
                const finalizedKey = `finalized_order_${pending.orderCode}`;
                if (sessionStorage.getItem(finalizedKey)) {
                    return;
                }

                const regData = pending.registrationData;

                // Đánh dấu eKYC là đã xác thực
                setVerifyResult({ isReal: true, liveness_msg: 'Đã xác thực trước đó' });
                setFrontPreview(null);
                setBackPreview(null);

                setFormData({
                    full_name: regData.customer_info?.full_name || '',
                    phone: regData.customer_info?.phone || '',
                    email: regData.customer_info?.email || '',
                    vehicle_type_id: regData.vehicle_info?.vehicle_type_id || '',
                    plate_number: regData.vehicle_info?.plate_number || '',
                    brand: regData.vehicle_info?.brand || '',
                    color: regData.vehicle_info?.color || '',
                    package_id: regData.package_id || '',
                    card_code: regData.card_code || '',
                    cccd_number: regData.customer_info?.cccd_number || ''
                });

                setPaymentOrderCode(pending.orderCode);
                setPaymentMethod(pending.paymentMethod);
                setPaymentStatus(pending.status);
                setPayUrl(pending.payUrl);
                setContractAccepted(true);

                if (pending.status === 'paid') {
                    setStep(5);
                } else {
                    setStep(4);
                }
            }
        } catch (err) {
            console.error('Lỗi khi kiểm tra giao dịch chờ thanh toán:', err);
        }
    };
    // ── Helpers ───────────────────────────────────────────────────
    const convertToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });

    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    // ── Xác thực eKYC ────────────────────────────────────────────
    const handleVerifyDocument = async () => {
        if (!frontImg || !backImg) return;
        setVerifying(true); setVerifyResult(null); setError(null);
        try {
            const frontBase64 = frontImg ? await convertToBase64(frontImg) : null;
            const backBase64 = backImg ? await convertToBase64(backImg) : null;
            const res = await axios.post(`${API}/month-card/verify-document`,
                { front_base64: frontBase64, back_base64: backBase64 },
                { headers: authHeaders() }
            );
            if (res.data?.success) {
                setVerifyResult(res.data);
                // Tự động điền thông tin từ eKYC OCR nếu có
                if (res.data.ocrData) {
                    const ocr = res.data.ocrData;
                    setFormData(prev => ({
                        ...prev,
                        // Tự động điền Họ tên và Số CCCD từ kết quả OCR (chỉ điền nếu trường hiện tại đang trống)
                        full_name: prev.full_name || ocr.name || prev.full_name,
                        cccd_number: prev.cccd_number || ocr.id || prev.cccd_number,
                    }));
                }
            } else {
                setVerifyResult({ isReal: false, liveness_msg: 'Không thể xác thực tính hợp lệ.' });
            }
        } catch (err) {
            setVerifyResult({ isReal: false, liveness_msg: err.response?.data?.error || 'Lỗi kết nối eKYC.' });
        } finally {
            setVerifying(false);
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setVerifyResult(null);
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'front') { setFrontImg(file); setFrontPreview(reader.result); }
            else { setBackImg(file); setBackPreview(reader.result); }
        };
        reader.readAsDataURL(file);
    };

    // ── Điều hướng bước ──────────────────────────────────────────
    const handleNextStep = async () => {
        setError(null);
        if (step === 1) {
            const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!phoneRegex.test(formData.phone)) { setError('Số điện thoại không hợp lệ.'); return; }
            if (!emailRegex.test(formData.email)) { setError('Email không hợp lệ.'); return; }
            setStep(2);
        } else if (step === 2) {
            const rawPlate = (formData.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase();
            if (!rawPlate) { setError('Vui lòng nhập biển số xe.'); return; }
            if (!/^\d{2}[A-Z]\d{4,5}$/.test(rawPlate)) { setError('Biển số không đúng định dạng (vd: 30K-12345).'); return; }
            setLoading(true);
            try {
                const res = await axios.post(`${API}/month-card/check-plate`,
                    { plate: formData.plate_number },
                    { headers: authHeaders() }
                );
                if (res.data.allowed) setStep(3);
                else setError(res.data.message || 'Biển số xe không được phép đăng ký.');
            } catch (err) {
                setError(err.response?.data?.error || err.response?.data?.message || 'Không thể kiểm tra biển số xe.');
            } finally {
                setLoading(false);
            }
        } else if (step === 3) {
            setStep(4);
        }
        // Bước 4 → 5 được xử lý qua handleInitiatePayment
    };

    // ── Bước 4: Khởi tạo đăng ký + VNPay ────────────────────────
    const handleInitiatePayment = async () => {
        if (!contractAccepted) { setError('Vui lòng đọc và đồng ý điều khoản hợp đồng.'); return; }
        setInitiating(true); setError(null);

        const selectedPkg = packages.find(p => p.package_id === formData.package_id);

        try {
            const res = await axios.post(`${API}/month-card/initiate-payment`, {
                customer_info: {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    email: formData.email,
                    cccd_number: formData.cccd_number || ''
                },
                vehicle_info: {
                    vehicle_type_id: formData.vehicle_type_id,
                    plate_number: formData.plate_number,
                    brand: formData.brand,
                    color: formData.color
                },
                package_id: formData.package_id,
                payment_method: paymentMethod
            }, { headers: authHeaders() });

            const { data } = res.data;
            setVehiclePackageId(data.vehiclePackageId);
            setPaymentOrderCode(data.orderCode);
            setPaymentStatus('pending');
            setPayUrl(data.payUrl);

            if (paymentMethod === 'vnpay') {
                // Mở trang VNPay trong tab mới
                window.open(data.payUrl, '_blank');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Lỗi khởi tạo thanh toán. Vui lòng thử lại.');
        } finally {
            setInitiating(false);
        }
    };

    // ── Bước 4: Xác nhận đã thanh toán VNPay ────────────────────
    const handleCheckPayment = async () => {
        if (!paymentOrderCode) return;
        setChecking(true); setError(null);
        try {
            const res = await axios.get(`${API}/month-card/payment-status/${paymentOrderCode}`,
                { headers: authHeaders() }
            );
            if (res.data.status === 'Đã thanh toán') {
                setPaymentStatus('paid');
                setTimeout(() => setStep(5), 1000);
            } else {
                setPaymentStatus('pending');
                setError('Giao dịch VNPay chưa được xác nhận. Vui lòng hoàn tất thanh toán rồi thử lại.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể kiểm tra trạng thái thanh toán.');
        } finally {
            setChecking(false);
        }
    };

    // ── Bước 4: Xác nhận đã nhận tiền mặt từ khách hàng ──────────
    const handleConfirmCashPayment = async () => {
        if (!paymentOrderCode) return;
        setChecking(true); setError(null);
        try {
            await axios.post(`${API}/month-card/confirm-cash-payment/${paymentOrderCode}`, {}, {
                headers: authHeaders()
            });
            setPaymentStatus('paid');
            setTimeout(() => setStep(5), 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể xác nhận thanh toán tiền mặt.');
        } finally {
            setChecking(false);
        }
    };

    // ── Bước 5: Hoàn tất đăng ký (Cấp RFID) ─────────────────────
    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.card_code) { setError('Vui lòng nhập mã thẻ RFID.'); return; }

        setLoading(true); setError(null); setSuccessMessage('');
        try {
            await axios.post(`${API}/month-card/finalize-registration`, {
                vehiclePackageId,
                card_code: formData.card_code,
                payment_method: paymentMethod,
                orderCode: paymentOrderCode,
                customer_info: {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    email: formData.email,
                    cccd_number: formData.cccd_number
                },
                vehicle_info: {
                    vehicle_type_id: formData.vehicle_type_id,
                    plate_number: formData.plate_number,
                    brand: formData.brand,
                    color: formData.color
                },
                package_id: formData.package_id
            }, { headers: authHeaders() });

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('monthCardLogsUpdated'));
            }
            // Đánh dấu orderCode này đã hoàn tất để không bị khôi phục lại ở lần mở tiếp theo
            if (paymentOrderCode) {
                sessionStorage.setItem(`finalized_order_${paymentOrderCode}`, '1');
            }
            setSuccessMessage('Đăng ký vé tháng thành công!');
            setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể hoàn tất đăng ký.');
        } finally {
            setLoading(false);
        }
    };

    // ── Lấy gói đã chọn ──────────────────────────────────────────
    const selectedPackage = packages.find(p => p.package_id === formData.package_id);

    if (!isOpen) return null;

    // ── Nút Tiếp theo bị disabled? ────────────────────────────────
    // Lưu ý: Không kiểm tra định dạng regex (phone, email) ở đây để tránh làm nút bị khóa cứng (disabled)
    // mà không có phản hồi. Định dạng sẽ được kiểm tra và hiển thị thông báo lỗi tại handleNextStep khi click.
    const isNextDisabled =
        (step === 1 && (!frontImg || !backImg || !formData.full_name || !formData.phone || !formData.email || !verifyResult?.isReal)) ||
        (step === 2 && (!formData.vehicle_type_id || !formData.plate_number || loading)) ||
        (step === 3 && !formData.package_id);

    return (
        <div className="renew-modal-overlay">
            <div className="renew-modal" style={{ maxWidth: '680px', width: '100%', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div className="renew-modal-header">
                    <h2>Đăng Ký Vé Tháng</h2>
                    <button type="button" className="renew-modal-close" onClick={onClose} disabled={loading || initiating}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Thanh tiến trình */}
                <div style={{ display: 'flex', padding: '12px 24px', background: '#f5f5f9', borderBottom: '1px solid #e1e1ee', gap: '4px' }}>
                    {['VNPT eKYC', 'Thông tin xe', 'Gói tháng', 'Xác nhận & TT', 'Cấp RFID'].map((label, idx) => {
                        const s = idx + 1;
                        const active = step === s;
                        const done = step > s;
                        return (
                            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: done ? '#10b981' : active ? '#004bca' : '#e1e1ee',
                                    color: (done || active) ? '#fff' : '#999',
                                    fontSize: 12, fontWeight: 700, transition: 'all 0.3s'
                                }}>
                                    {done ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> : s}
                                </div>
                                <div style={{ fontSize: 11, color: active ? '#004bca' : done ? '#10b981' : '#999', fontWeight: active ? 700 : 400 }}>
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>


                <form onSubmit={step === 5 ? handleFinalSubmit : e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>{error}
                        </div>}
                        {successMessage && <div style={{ color: '#10b981', background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', fontSize: 14 }}>✅ {successMessage}</div>}

                        {/* ══════════════════════════════════════════════
                            BƯỚC 1: VNPT eKYC
                        ══════════════════════════════════════════════ */}
                        {step === 1 && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {[{ label: 'Mặt trước CCCD', type: 'front', preview: frontPreview }, { label: 'Mặt sau CCCD', type: 'back', preview: backPreview }].map(({ label, type, preview }) => (
                                        <div className="renew-form-group" key={type}>
                                            <label>{label}</label>
                                            <div style={{ border: `2px dashed ${preview ? '#004bca' : '#ccc'}`, borderRadius: 8, padding: 8, textAlign: 'center', position: 'relative', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: preview ? '#f0f5ff' : '#fafafa', transition: 'all 0.2s' }}>
                                                {preview ? <img src={preview} alt={label} style={{ maxWidth: '100%', maxHeight: 106, borderRadius: 4 }} /> : <span style={{ fontSize: 13, color: '#888' }}>📷 Nhấn để chọn ảnh</span>}
                                                <input type="file" accept="image/*" onChange={e => handleFileChange(e, type)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {frontImg && backImg && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <button type="button" onClick={handleVerifyDocument} disabled={verifying}
                                            style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: verifying ? '#e0e0e0' : 'linear-gradient(135deg, #004bca 0%, #002d80 100%)', color: verifying ? '#888' : '#fff', fontWeight: 600, cursor: verifying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            {verifying ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>sync</span>Đang xác thực...</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>Xác thực giấy tờ VNPT eKYC</>}
                                        </button>

                                        {verifyResult && (
                                            <div style={{ padding: 14, borderRadius: 8, background: verifyResult.isReal ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: `1px solid ${verifyResult.isReal ? '#34d399' : '#f87171'}`, display: 'flex', gap: 12 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 24, color: verifyResult.isReal ? '#059669' : '#dc2626', marginTop: 2 }}>{verifyResult.isReal ? 'check_circle' : 'cancel'}</span>
                                                <div style={{ fontSize: 14 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 15, color: verifyResult.isReal ? '#065f46' : '#991b1b' }}>
                                                        {verifyResult.isReal ? 'Xác thực thành công — Giấy tờ hợp lệ' : 'Xác thực thất bại — Nghi ngờ giả mạo'}
                                                    </div>
                                                    <div style={{ opacity: 0.85, marginTop: 2, color: verifyResult.isReal ? '#065f46' : '#991b1b' }}>Kết quả: {verifyResult.liveness_msg}</div>
                                                    {verifyResult.face_swapping && <div style={{ color: '#d97706', fontWeight: 600, marginTop: 4 }}>⚠️ Phát hiện dán ảnh giả (face swapping)</div>}
                                                    {verifyResult.fake_liveness && <div style={{ color: '#d97706', fontWeight: 600, marginTop: 4 }}>⚠️ Phát hiện in ấn/chụp lại từ màn hình</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="renew-form-group" style={{ gridColumn: '1/-1' }}>
                                        <label>Họ và tên khách hàng <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="renew-select" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div className="renew-form-group">
                                        <label>Số điện thoại <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" className="renew-select" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="09x-xxx-xxxx" />
                                    </div>
                                    <div className="renew-form-group">
                                        <label>Địa chỉ Email <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="email" className="renew-select" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                                    </div>
                                    <div className="renew-form-group" style={{ gridColumn: '1/-1' }}>
                                        <label>Số CCCD/CMND <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>(tùy chọn — dùng cho hợp đồng)</span></label>
                                        <input type="text" className="renew-select" value={formData.cccd_number} onChange={e => setFormData({ ...formData, cccd_number: e.target.value })} placeholder="079xxxxxxxxxxxxx" maxLength={12} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ══════════════════════════════════════════════
                            BƯỚC 2: THÔNG TIN XE
                        ══════════════════════════════════════════════ */}
                        {step === 2 && (
                            <>
                                <div className="renew-form-group">
                                    <label>Phân loại phương tiện <span style={{ color: '#ef4444' }}>*</span></label>
                                    <select className="renew-select" value={formData.vehicle_type_id} onChange={e => setFormData({ ...formData, vehicle_type_id: e.target.value, package_id: '' })}>
                                        <option value="">-- Chọn nhóm xe --</option>
                                        {vehicleTypes.map(t => <option key={t.vehicle_type_id} value={t.vehicle_type_id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="renew-form-group">
                                    <label>Biển số xe <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" className="renew-select" value={formData.plate_number} onChange={e => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} placeholder="30K-12345 hoặc 59X3-12345" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="renew-form-group">
                                        <label>Hãng xe <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>(tùy chọn)</span></label>
                                        <input type="text" className="renew-select" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Honda, Toyota..." />
                                    </div>
                                    <div className="renew-form-group">
                                        <label>Màu sắc <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>(tùy chọn)</span></label>
                                        <input type="text" className="renew-select" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="Đen, Trắng..." />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ══════════════════════════════════════════════
                            BƯỚC 3: GÓI THÁNG
                        ══════════════════════════════════════════════ */}
                        {step === 3 && (
                            <>
                                <label style={{ fontWeight: 600, fontSize: 15 }}>Chọn gói cước phù hợp</label>
                                {packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).length > 0 ? (
                                    packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).map(pkg => (
                                        <div key={pkg.package_id}
                                            onClick={() => setFormData({ ...formData, package_id: pkg.package_id })}
                                            style={{ border: formData.package_id === pkg.package_id ? '2px solid #004bca' : '1px solid #e1e1ee', padding: '14px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', cursor: 'pointer', background: formData.package_id === pkg.package_id ? '#f0f5ff' : '#fff', transition: 'all 0.2s' }}>
                                            <input type="radio" checked={formData.package_id === pkg.package_id} readOnly style={{ marginRight: 12, transform: 'scale(1.2)' }} />
                                            <div style={{ flexGrow: 1 }}>
                                                <strong style={{ fontSize: 15 }}>{pkg.name}</strong>
                                                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Thời hạn: {pkg.duration_month} tháng</div>
                                            </div>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#006d38' }}>{Number(pkg.price).toLocaleString('vi-VN')} ₫</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#ba1a1a', fontSize: 13 }}>⚠️ Không có gói cước tương thích với loại xe đã chọn ở Bước 2.</p>
                                )}
                            </>
                        )}

                        {/* ══════════════════════════════════════════════
                            BƯỚC 4: XÁC NHẬN & THANH TOÁN
                        ══════════════════════════════════════════════ */}
                        {step === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 16, color: '#111' }}>📋 HỢP ĐỒNG CUNG CẤP DỊCH VỤ TRÔNG GIỮ XE THÁNG</h3>

                                {/* Bảng hợp đồng với thông tin đầy đủ từ eKYC + xe + gói */}
                                <div className="contract-box">
                                    <p style={{ fontWeight: 700, color: '#004bca', marginBottom: 10, fontSize: 14 }}>THÔNG TIN KHÁCH HÀNG (đã xác thực eKYC)</p>
                                    <table>
                                        <tbody>
                                            <tr><td>Họ và tên</td><td>{formData.full_name || '—'}</td></tr>
                                            <tr><td>Số điện thoại</td><td>{formData.phone}</td></tr>
                                            <tr><td>Email</td><td>{formData.email}</td></tr>
                                            <tr><td>Xác thực eKYC</td><td style={{ color: '#059669', fontWeight: 600 }}>✅ {verifyResult?.liveness_msg || 'Đã xác thực'}</td></tr>
                                        </tbody>
                                    </table>

                                    <p style={{ fontWeight: 700, color: '#004bca', margin: '12px 0 10px', fontSize: 14 }}>THÔNG TIN PHƯƠNG TIỆN</p>
                                    <table>
                                        <tbody>
                                            <tr><td>Biển số xe</td><td>{(formData.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase()}</td></tr>
                                            <tr><td>Loại xe</td><td>{vehicleTypes.find(t => String(t.vehicle_type_id) === String(formData.vehicle_type_id))?.name || '—'}</td></tr>
                                            <tr><td>Hãng xe</td><td>{formData.brand || '—'}</td></tr>
                                            <tr><td>Màu sắc</td><td>{formData.color || '—'}</td></tr>
                                        </tbody>
                                    </table>

                                    <p style={{ fontWeight: 700, color: '#004bca', margin: '12px 0 10px', fontSize: 14 }}>GÓI DỊCH VỤ & GIÁ</p>
                                    <table>
                                        <tbody>
                                            <tr><td>Tên gói</td><td>{selectedPackage?.name || '—'}</td></tr>
                                            <tr><td>Thời hạn</td><td>{selectedPackage?.duration_month || '—'} tháng</td></tr>
                                            <tr>
                                                <td>Ngày bắt đầu</td>
                                                <td>{new Date().toLocaleDateString('vi-VN')}</td>
                                            </tr>
                                            <tr>
                                                <td>Ngày kết thúc</td>
                                                <td>
                                                    {selectedPackage?.duration_month
                                                        ? (() => {
                                                            const d = new Date();
                                                            d.setMonth(d.getMonth() + Number(selectedPackage.duration_month));
                                                            return d.toLocaleDateString('vi-VN');
                                                        })()
                                                        : '—'}
                                                </td>
                                            </tr>
                                            <tr><td>Phí dịch vụ</td><td style={{ fontWeight: 700, color: '#006d38', fontSize: 15 }}>{selectedPackage ? Number(selectedPackage.price).toLocaleString('vi-VN') + ' ₫' : '—'}</td></tr>
                                            <tr>
                                                <td>Trạng thái thanh toán</td>
                                                <td style={{ fontWeight: 600, color: paymentStatus === 'paid' ? '#059669' : paymentStatus === 'pending' ? '#d97706' : '#6b7280' }}>
                                                    {paymentStatus === 'paid' ? 'Đã thanh toán' : paymentStatus === 'pending' ? 'Chờ thanh toán' : 'Chưa thanh toán'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <p style={{ fontSize: 13, color: '#555', marginTop: 12 }}>
                                        Bên cung cấp dịch vụ nhận giữ xe theo tháng cho khách hàng tại khu vực bãi xe được chỉ định.
                                        Khách hàng cam kết cung cấp thông tin chính xác và tuân thủ toàn bộ nội quy gửi xe.
                                        Vé tháng có hiệu lực theo thời hạn của gói đã đăng ký.
                                    </p>
                                </div>

                                {/* Checkbox đồng ý */}
                                <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                                    <input type="checkbox" checked={contractAccepted} onChange={e => setContractAccepted(e.target.checked)} style={{ transform: 'scale(1.3)' }} />
                                    <span>Tôi đã đọc và <strong>đồng ý toàn bộ</strong> điều khoản hợp đồng trên</span>
                                </label>

                                {/* Phương thức thanh toán */}
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>💳 Phương thức thanh toán</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div className={`pay-method-card ${paymentMethod === 'vnpay' ? 'selected' : ''}`} onClick={() => { setPaymentMethod('vnpay'); setPaymentStatus(null); }}>
                                            <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/image002-20230907165956795.jpg" alt="VNPay" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }} onError={e => e.target.style.display = 'none'} />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>VNPay</div>
                                                <div style={{ fontSize: 12, color: '#666' }}>Thanh toán qua cổng VNPay</div>
                                            </div>
                                            {paymentMethod === 'vnpay' && <span className="material-symbols-outlined" style={{ marginLeft: 'auto', color: '#004bca' }}>check_circle</span>}
                                        </div>
                                        <div className={`pay-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`} onClick={() => { setPaymentMethod('cash'); setPaymentStatus(null); }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 42, color: '#059669' }}>payments</span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>Tiền mặt</div>
                                                <div style={{ fontSize: 12, color: '#666' }}>Thu tiền trực tiếp tại quầy</div>
                                            </div>
                                            {paymentMethod === 'cash' && <span className="material-symbols-outlined" style={{ marginLeft: 'auto', color: '#059669' }}>check_circle</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Trạng thái VNPay/Tiền mặt sau khi mở tab / khởi tạo */}
                                {paymentStatus === 'pending' && paymentMethod === 'vnpay' && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⏳ Đang chờ xác nhận thanh toán VNPay</div>
                                        <div style={{ fontSize: 13, color: '#78350f', marginBottom: 10 }}>Cửa sổ VNPay đã được mở. Sau khi hoàn tất thanh toán, bấm nút bên dưới để tiếp tục.</div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button type="button" onClick={handleCheckPayment} disabled={checking}
                                                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: checking ? '#e0e0e0' : '#059669', color: checking ? '#888' : '#fff', fontWeight: 600, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                                                {checking ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>Đang kiểm tra...</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>Tôi đã thanh toán xong</>}
                                            </button>
                                            <button type="button"
                                                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                                                onClick={() => {
                                                    if (payUrl) {
                                                        window.open(payUrl, '_blank');
                                                    } else {
                                                        handleInitiatePayment();
                                                    }
                                                }} disabled={initiating}>
                                                🔄 Mở lại trang VNPay
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {paymentStatus === 'pending' && paymentMethod === 'cash' && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>💵 Đang chờ xác nhận thu tiền mặt</div>
                                        <div style={{ fontSize: 13, color: '#78350f', marginBottom: 10 }}>Vui lòng thu tiền trực tiếp từ khách hàng. Sau khi nhận đủ tiền mặt, bấm xác nhận bên dưới.</div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button type="button" onClick={handleConfirmCashPayment} disabled={checking}
                                                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: checking ? '#e0e0e0' : '#059669', color: checking ? '#888' : '#fff', fontWeight: 600, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                                                {checking ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>Đang xác nhận...</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>Xác nhận đã nhận tiền mặt</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {paymentStatus === 'paid' && (
                                    <div style={{ background: '#ecfdf5', border: '1px solid #34d399', borderRadius: 8, padding: 14, fontWeight: 700, color: '#065f46' }}>
                                        {paymentMethod === 'vnpay'
                                            ? '✅ Thanh toán VNPay xác nhận thành công! Vui lòng bấm Tiếp theo để qua Bước 5.'
                                            : '✅ Đã xác nhận thu tiền mặt thành công! Vui lòng bấm Tiếp theo để qua Bước 5.'}
                                    </div>
                                )}

                                {/* Nút khởi tạo thanh toán */}
                                {!paymentStatus && (
                                    <button type="button" onClick={handleInitiatePayment} disabled={!contractAccepted || initiating}
                                        style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: (!contractAccepted || initiating) ? '#e0e0e0' : paymentMethod === 'vnpay' ? 'linear-gradient(135deg,#004bca,#002d80)' : 'linear-gradient(135deg,#059669,#065f46)', color: (!contractAccepted || initiating) ? '#888' : '#fff', fontWeight: 700, cursor: (!contractAccepted || initiating) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}>
                                        {initiating ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>sync</span>Đang xử lý...</> :
                                            paymentMethod === 'vnpay' ? <><span className="material-symbols-outlined" style={{ fontSize: 20 }}>open_in_new</span>Thanh toán qua VNPay — {selectedPackage ? Number(selectedPackage.price).toLocaleString('vi-VN') + ' ₫' : '—'}</> :
                                                <><span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>Khởi tạo thu tiền mặt — {selectedPackage ? Number(selectedPackage.price).toLocaleString('vi-VN') + ' ₫' : '—'}</>}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                            BƯỚC 5: CẤP RFID
                        ══════════════════════════════════════════════ */}
                        {step === 5 && (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ padding: '16px 0' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 60, color: '#004bca' }}>badge</span>
                                    <p style={{ fontSize: 15, color: '#333', marginTop: 8, fontWeight: 600 }}>Cấp mã thẻ RFID cho khách hàng</p>
                                    <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Mã được tự động sinh theo thứ tự. Bạn có thể chỉnh sửa nếu cần.</p>
                                    {paymentMethod === 'cash' && (
                                        <div style={{ display: 'inline-block', marginTop: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
                                            💵 Phương thức: Tiền mặt — Thu tiền trực tiếp tại quầy
                                        </div>
                                    )}
                                    {paymentMethod === 'vnpay' && paymentStatus === 'paid' && (
                                        <div style={{ display: 'inline-block', marginTop: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
                                            ✅ Thanh toán VNPay đã xác nhận — Mã: {paymentOrderCode}
                                        </div>
                                    )}
                                </div>
                                <div className="renew-form-group" style={{ textAlign: 'left' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        Mã Thẻ Tháng (RFID)
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#e8f5e9', color: '#2e7d32' }}>Tự động</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" className="renew-select"
                                            value={codeLoading ? 'Đang sinh mã...' : formData.card_code}
                                            onChange={e => setFormData({ ...formData, card_code: e.target.value.toUpperCase() })}
                                            placeholder="MONTH0001" disabled={codeLoading}
                                            style={{ textAlign: 'center', letterSpacing: '3px', fontWeight: 'bold', fontSize: 20, color: '#004bca', border: '2px solid #004bca', borderRadius: 8, background: codeLoading ? '#f5f5f9' : '#f0f5ff' }}
                                            autoFocus />
                                        {codeLoading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', border: '2px solid #004bca', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />}
                                    </div>
                                    <p style={{ fontSize: 12, color: '#888', marginTop: 6, textAlign: 'center' }}>
                                        💡 Mã sinh tự động theo thứ tự. Bạn có thể nhập tay nếu muốn dùng mã khác.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer điều hướng ──────────────────────────────────── */}
                    <div className="renew-modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e1e1ee', marginTop: 'auto' }}>
                        <div>
                            {step > 1 && step !== 4 && (
                                <button type="button" className="renew-btn secondary" onClick={() => { setError(null); setStep(s => s - 1); }} disabled={loading || initiating}>
                                    Quay lại
                                </button>
                            )}
                            {step === 4 && !paymentStatus && (
                                <button type="button" className="renew-btn secondary" onClick={() => { setError(null); setStep(3); }} disabled={initiating}>
                                    Quay lại
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="renew-btn secondary" onClick={onClose} disabled={loading || initiating}>
                                {paymentStatus === 'pending' ? 'Để sau' : 'Hủy bỏ'}
                            </button>

                            {/* Bước 1–3: nút Tiếp theo */}
                            {step < 4 && (
                                <button type="button" className="cp-btn cp-btn-primary" disabled={isNextDisabled} onClick={handleNextStep}>
                                    {loading && step === 2 ? 'Đang kiểm tra...' : 'Tiếp theo'}
                                </button>
                            )}

                            {/* Bước 4: Nút Tiếp theo (BR-PAY-04: bị vô hiệu hóa khi khác "Đã thanh toán") */}
                            {step === 4 && (
                                <button type="button" className="cp-btn cp-btn-primary" disabled={paymentStatus !== 'paid'} onClick={() => setStep(5)}>
                                    Tiếp theo
                                </button>
                            )}

                            {/* Bước 5: Hoàn tất */}
                            {step === 5 && (
                                <button type="submit" className="renew-btn primary"
                                    style={{ backgroundColor: '#006d38', borderColor: '#006d38' }}
                                    disabled={!formData.card_code || loading || codeLoading}>
                                    {loading ? 'Đang lưu...' : '🏁 Hoàn tất đăng ký'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
