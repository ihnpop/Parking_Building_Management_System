import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CreateMonthCardDialog({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Metadata từ hệ thống
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [packages, setPackages] = useState([]);

    // Trạng thái lưu trữ tệp ảnh phục vụ eKYC
    const [frontImg, setFrontImg] = useState(null);
    const [backImg, setBackImg] = useState(null);
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);

    // Dữ liệu Form tổng hợp
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '',
        vehicle_type_id: '',
        plate_number: '',
        brand: '',
        color: '',
        package_id: '',
        card_code: ''
    });

    // Tải danh mục loại xe và gói cước khi mở Dialog
    useEffect(() => {
        if (isOpen) {
            const fetchMetadata = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };

                    const [resType, resPkg] = await Promise.all([
                        axios.get('/api/vehicle-types', { headers }),
                        axios.get('/api/packages', { headers })
                    ]);

                    setVehicleTypes(resType.data || []);
                    setPackages(resPkg.data || []);
                } catch (err) {
                    console.error("Lỗi tải thông tin cấu hình danh mục:", err);
                    setError("Không thể tải danh mục cấu hình xe và gói cước.");
                }
            };

            fetchMetadata();

            // Reset trạng thái form về ban đầu khi mở lại
            setStep(1);
            setError(null);
            setSuccessMessage('');
            setFrontImg(null);
            setBackImg(null);
            setFrontPreview(null);
            setBackPreview(null);
            setFormData({
                full_name: '',
                phone: '',
                email: '',
                vehicle_type_id: '',
                plate_number: '',
                brand: '',
                color: '',
                package_id: '',
                card_code: ''
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Hàm chuyển đổi ảnh sang Base64 chuỗi thuần để gửi API
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'front') {
                setFrontImg(file);
                setFrontPreview(reader.result);
            } else {
                setBackImg(file);
                setBackPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    // Hàm submit luồng tổng gửi lên Backend Node.js
    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();

        setLoading(true);
        setError(null);
        setSuccessMessage('');

        try {
            const frontBase64 = await convertToBase64(frontImg);
            const backBase64 = await convertToBase64(backImg);

            const payload = {
                customer_info: {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    email: formData.email
                },
                img_front_base64: frontBase64,
                img_back_base64: backBase64,
                vehicle_info: {
                    vehicle_type_id: formData.vehicle_type_id,
                    plate_number: formData.plate_number,
                    brand: formData.brand,
                    color: formData.color
                },
                package_id: formData.package_id,
                card_code: formData.card_code
            };

            const token = localStorage.getItem('token');
            const response = await axios.post('/api/parking/register-monthly', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success || response.data) {
                setSuccessMessage('Đăng ký vé tháng khép kín thành công!');
                setTimeout(() => {
                    onSuccess?.(); // Làm mới danh sách ngoài màn hình chính
                    onClose();     // Đóng modal
                }, 1500);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Hệ thống không thể hoàn tất luồng đăng ký.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="renew-modal-overlay">
            <div
                className="renew-modal"
                style={{
                    maxWidth: '650px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div className="renew-modal-header">
                    <h2>Đăng Ký Vé Tháng Khép Kín (VNPT eKYC)</h2>
                    <button
                        type="button"
                        className="renew-modal-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Thanh tiến trình báo bước */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 24px', background: '#f5f5f9', borderBottom: '1px solid #e1e1ee' }}>
                    <span style={{ fontWeight: step === 1 ? '600' : '400', color: step === 1 ? '#004bca' : '#666' }}>1. VNPT eKYC</span>
                    <span style={{ fontWeight: step === 2 ? '600' : '400', color: step === 2 ? '#004bca' : '#666' }}>2. Thông tin xe</span>
                    <span style={{ fontWeight: step === 3 ? '600' : '400', color: step === 3 ? '#004bca' : '#666' }}>3. Gói tháng</span>
                    <span style={{ fontWeight: step === 4 ? '600' : '400', color: step === 4 ? '#004bca' : '#666' }}>4. Cấp RFID</span>
                </div>

                {/* Form Body Content */}
                <form onSubmit={step === 4 ? handleFinalSubmit : (e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {error && (
                            <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div style={{ color: '#10b981', background: '#ecfdf5', padding: '12px', borderRadius: '8px' }}>
                                {successMessage}
                            </div>
                        )}

                        {/* BƯỚC 1: XÁC THỰC DANH TÍNH KHÁCH HÀNG */}
                        {step === 1 && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="renew-form-group">
                                        <label>Mặt trước CCCD</label>
                                        <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '10px', textAlign: 'center', position: 'relative', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
                                            {frontPreview ? (
                                                <img src={frontPreview} alt="Mặt trước" style={{ maxWidth: '100%', maxHeight: '110px', borderRadius: '4px' }} />
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#888' }}>Chưa chọn ảnh</span>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                    <div className="renew-form-group">
                                        <label>Mặt sau CCCD</label>
                                        <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '10px', textAlign: 'center', position: 'relative', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
                                            {backPreview ? (
                                                <img src={backPreview} alt="Mặt sau" style={{ maxWidth: '100%', maxHeight: '110px', borderRadius: '4px' }} />
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#888' }}>Chưa chọn ảnh</span>
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="renew-form-group">
                                    <label>Họ và tên khách hàng</label>
                                    <input type="text" className="renew-select" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ví dụ: Nguyễn Văn A" />
                                </div>
                                <div className="renew-form-group">
                                    <label>Số điện thoại liên hệ</label>
                                    <input type="text" className="renew-select" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Nhập số điện thoại chính chủ" />
                                </div>
                                <div className="renew-form-group">
                                    <label>Địa chỉ Email</label>
                                    <input type="email" className="renew-select" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Nhập email nhận thông báo hóa đơn" />
                                </div>
                            </>
                        )}

                        {/* BƯỚC 2: THÔNG TIN PHƯƠNG TIỆN */}
                        {step === 2 && (
                            <>
                                <div className="renew-form-group">
                                    <label>Phân loại phương tiện</label>
                                    <select className="renew-select" value={formData.vehicle_type_id} onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value, package_id: '' })}>
                                        <option value="">-- Chọn nhóm xe --</option>
                                        {vehicleTypes.map(t => (
                                            <option key={t.vehicle_type_id} value={t.vehicle_type_id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="renew-form-group">
                                    <label>Biển số xe kiểm soát</label>
                                    <input type="text" className="renew-select" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} placeholder="Ví dụ: 30K-12345 hoặc 59X3-12345" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="renew-form-group">
                                        <label>Hãng sản xuất (Tùy chọn)</label>
                                        <input type="text" className="renew-select" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Ví dụ: Honda, Toyota" />
                                    </div>
                                    <div className="renew-form-group">
                                        <label>Màu sắc xe (Tùy chọn)</label>
                                        <input type="text" className="renew-select" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="Ví dụ: Đen, Trắng" />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* BƯỚC 3: GÓI CƯỚC THÁNG & THANH TOÁN */}
                        {step === 3 && (
                            <>
                                <label style={{ fontWeight: '500', marginBottom: '-8px', display: 'block' }}>Danh sách gói cước phù hợp</label>
                                {packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).length > 0 ? (
                                    packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).map(pkg => (
                                        <div
                                            key={pkg.package_id}
                                            style={{
                                                border: formData.package_id === pkg.package_id ? '2px solid #004bca' : '1px solid #e1e1ee',
                                                padding: '14px',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                backgroundColor: formData.package_id === pkg.package_id ? '#f0f5ff' : '#fff'
                                            }}
                                            onClick={() => setFormData({ ...formData, package_id: pkg.package_id })}
                                        >
                                            <input type="radio" checked={formData.package_id === pkg.package_id} readOnly style={{ marginRight: '12px', transform: 'scale(1.2)' }} />
                                            <div style={{ flexGrow: 1 }}>
                                                <strong style={{ fontSize: '15px' }}>{pkg.name}</strong>
                                                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Thời hạn áp dụng: {pkg.duration_month} tháng</div>
                                            </div>
                                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#006d38' }}>{Number(pkg.price).toLocaleString()} VND</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#ba1a1a', fontSize: '13px' }}>⚠️ Không tìm thấy gói cước tháng tương thích với phân loại xe đã chọn ở Bước 2.</p>
                                )}
                                <div style={{ marginTop: '10px', padding: '12px', background: '#fff8ec', borderLeft: '4px solid #f9a825', borderRadius: '4px', fontSize: '13px', color: '#6e4d13' }}>
                                    💡 <strong>Ủy nhiệm thu ngân:</strong> Xác nhận khách hàng đã hoàn tất nộp đúng số tiền của gói cước tại quầy (Tiền mặt/Chuyển khoản QR code).
                                </div>
                            </>
                        )}

                        {/* BƯỚC 4: CẤP THẺ RFID CỨNG */}
                        {step === 4 && (
                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ padding: '20px 0' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#004bca' }}>rfid_handshake</span>
                                    <p style={{ fontSize: '15px', color: '#333', marginTop: '10px', fontWeight: '500' }}>Vui lòng đặt thẻ cứng lên thiết bị đầu đọc RFID tại quầy</p>
                                </div>
                                <div className="renew-form-group" style={{ textAlign: 'left' }}>
                                    <label>Mã UID Thẻ (Nhận diện tự động)</label>
                                    <input
                                        type="text"
                                        className="renew-select"
                                        value={formData.card_code}
                                        onChange={(e) => setFormData({ ...formData, card_code: e.target.value.toUpperCase() })}
                                        placeholder="Hệ thống đang chờ tín hiệu quẹt thẻ..."
                                        style={{ textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold', fontSize: '16px' }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Điều hướng */}
                    <div className="renew-modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e1e1ee', marginTop: 'auto' }}>
                        <div>
                            {step > 1 && (
                                <button type="button" className="renew-btn secondary" onClick={() => setStep(prev => prev - 1)} disabled={loading}>
                                    Quay lại
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="renew-btn secondary" onClick={onClose} disabled={loading}>
                                Hủy bỏ
                            </button>

                            {step < 4 ? (
                                <button
                                    type="button"
                                    className="renew-btn primary"
                                    disabled={
                                        (step === 1 && (!frontImg || !backImg || !formData.full_name || !formData.phone)) ||
                                        (step === 2 && (!formData.vehicle_type_id || !formData.plate_number)) ||
                                        (step === 3 && !formData.package_id)
                                    }
                                    onClick={() => setStep(prev => prev + 1)}
                                >
                                    Tiếp theo
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="renew-btn primary"
                                    style={{ backgroundColor: '#006d38', borderColor: '#006d38' }}
                                    disabled={!formData.card_code || loading}
                                >
                                    {loading ? "Đang đồng bộ luồng eKYC..." : "Hoàn tất đăng ký"}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
