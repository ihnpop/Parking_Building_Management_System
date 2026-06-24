import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CreateMonthCardDialog({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                }
            };
            fetchMetadata();
            // Reset trạng thái form về ban đầu
            setStep(1);
            setError(null);
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
    const handleFinalSubmit = async () => {
        setLoading(true);
        setError(null);
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

            if (response.data.success) {
                onSuccess(); // Trích xuất hành động làm mới danh sách ngoài màn hình chính
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Hệ thống không thể hoàn tất luồng đăng ký.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dialog-overlay">
            <div className="dialog-container" style={{ maxWidth: '650px', width: '100%' }}>
                {/* Header */}
                <div className="dialog-header">
                    <h3 className="dialog-title">Đăng Ký Vé Tháng Khép Kín (VNPT eKYC)</h3>
                    <button type="button" className="dialog-close-btn" onClick={onClose}>
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

                {/* Body Content */}
                <div className="dialog-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    {error && <div className="mc-error-message" style={{ marginBottom: '15px' }}>{error}</div>}

                    {/* BƯỚC 1: XÁC THỰC DANH TÍNH KHÁCH HÀNG */}
                    {step === 1 && (
                        <div className="dialog-form-grid" style={{ display: 'grid', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Mặt trước CCCD</label>
                                    <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '10px', textAlign: 'center', position: 'relative', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
                                        {frontPreview ? (
                                            <img src={frontPreview} alt="Mặt trước" style={{ maxWidth: '100%', maxHeight: '110px', borderRadius: '4px' }} />
                                        ) : (
                                            <span style={{ fontSize: '13px', color: '#888' }}>Chưa chọn ảnh</span>
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mặt sau CCCD</label>
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
                            <div className="form-group">
                                <label className="form-label">Số điện thoại liên hệ</label>
                                <input type="text" className="dialog-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Nhập số điện thoại chính chủ" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Địa chỉ Email</label>
                                <input type="email" className="dialog-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Nhập email nhận thông báo hóa đơn" />
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 2: THÔNG TIN PHƯƠNG TIỆN */}
                    {step === 2 && (
                        <div className="dialog-form-grid" style={{ display: 'grid', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Phân loại phương tiện</label>
                                <select className="dialog-input" value={formData.vehicle_type_id} onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}>
                                    <option value="">-- Chọn nhóm xe --</option>
                                    {vehicleTypes.map(t => (
                                        <option key={t.vehicle_type_id} value={t.vehicle_type_id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Biển số xe kiểm soát</label>
                                <input type="text" className="dialog-input" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} placeholder="Ví dụ: 59X3-12345" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Hãng sản xuất (Tùy chọn)</label>
                                    <input type="text" className="dialog-input" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Ví dụ: Honda, Yamaha" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Màu sắc xe (Tùy chọn)</label>
                                    <input type="text" className="dialog-input" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="Ví dụ: Đen, Đỏ-Trắng" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 3: GÓI CƯỚC THÁNG & THANH TOÁN */}
                    {step === 3 && (
                        <div className="dialog-form-grid" style={{ display: 'grid', gap: '12px' }}>
                            <label className="form-label">Danh sách gói cước phù hợp</label>
                            {packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).length > 0 ? (
                                packages.filter(p => String(p.vehicle_type_id) === String(formData.vehicle_type_id)).map(pkg => (
                                    <div key={pkg.package_id} style={{ border: formData.package_id === pkg.package_id ? '2px solid #004bca' : '1px solid #e1e1ee', padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer', backgroundColor: formData.package_id === pkg.package_id ? '#f0f5ff' : '#fff' }} onClick={() => setFormData({ ...formData, package_id: pkg.package_id })}>
                                        <input type="radio" checked={formData.package_id === pkg.package_id} readOnly style={{ marginRight: '12px', scale: '1.2' }} />
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
                        </div>
                    )}

                    {/* BƯỚC 4: CẤP THẺ RFID CỨNG */}
                    {step === 4 && (
                        <div className="dialog-form-grid" style={{ display: 'grid', gap: '16px', textAlign: 'center' }}>
                            <div style={{ padding: '20px 0' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#004bca', animation: 'pulse 1.5s infinite' }}>rfid_handshake</span>
                                <p style={{ fontSize: '15px', color: '#333', marginTop: '10px', fontWeight: '500' }}>Vui lòng đặt thẻ cứng lên thiết bị đầu đọc RFID tại quầy</p>
                            </div>
                            <div className="form-group" style={{ textAlign: 'left' }}>
                                <label className="form-label">Mã UID Thẻ (Nhận diện tự động)</label>
                                <input type="text" className="dialog-input" value={formData.card_code} onChange={(e) => setFormData({ ...formData, card_code: e.target.value.toUpperCase() })} placeholder="Hệ thống đang chờ tín hiệu quẹt thẻ..." style={{ textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold', fontSize: '16px' }} autoFocus />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Điều hướng */}
                <div className="dialog-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e1e1ee' }}>
                    <div>
                        {step > 1 && (
                            <button type="button" className="mc-btn mc-btn-outline" onClick={() => setStep(prev => prev - 1)} disabled={loading}>
                                Quay lại
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="mc-btn mc-btn-outline" onClick={onClose} disabled={loading}>
                            Hủy bỏ
                        </button>

                        {step < 4 ? (
                            <button type="button" className="mc-btn mc-btn-primary"
                                disabled={
                                    (step === 1 && (!frontImg || !backImg || !formData.phone)) ||
                                    (step === 2 && (!formData.vehicle_type_id || !formData.plate_number)) ||
                                    (step === 3 && !formData.package_id)
                                }
                                onClick={() => setStep(prev => prev + 1)}>
                                Tiếp theo
                            </button>
                        ) : (
                            <button type="button" className="mc-btn mc-btn-primary" style={{ backgroundColor: '#006d38' }} disabled={!formData.card_code || loading} onClick={handleFinalSubmit}>
                                {loading ? "Đang đồng bộ luồng eKYC..." : "Hoàn tất đăng ký"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}