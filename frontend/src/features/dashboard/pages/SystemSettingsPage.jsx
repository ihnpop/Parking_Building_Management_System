import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SystemSettingsPage() {
    const navigate = useNavigate();

    // Section 1: Thông tin hệ thống
    const [cameraInPath, setCameraInPath] = useState('D:\\ParkingData\\Images\\IN');
    const [cameraOutPath, setCameraOutPath] = useState('D:\\ParkingData\\Images\\OUT');
    const [logoUrl, setLogoUrl] = useState(null);

    // Section 2: Thiết bị ngoại vi
    const [comPortIn, setComPortIn] = useState('COM 3');
    const [comPortOut, setComPortOut] = useState('COM 6');
    const [cameraInPlate, setCameraInPlate] = useState('rtsp://admin:pass123@192.168.1.101:554/stream1');
    const [cameraInPanorama, setCameraInPanorama] = useState('rtsp://admin:pass123@192.168.1.102:554/stream1');
    const [cameraOutPlate, setCameraOutPlate] = useState('rtsp://admin:pass123@192.168.1.103:554/stream1');
    const [cameraOutPanorama, setCameraOutPanorama] = useState('rtsp://admin:pass123@192.168.1.104:554/stream1');

    // Section 3: Cấu hình vận hành
    const [autoOpenBarieIn, setAutoOpenBarieIn] = useState(true);
    const [autoOpenBarieOut, setAutoOpenBarieOut] = useState(false);
    const [storageDays, setStorageDays] = useState(90);
    const [plateDeviationLimit, setPlateDeviationLimit] = useState(1);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Kích thước ảnh vượt quá dung lượng cho phép 2MB!");
                return;
            }
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
        }
    };

    const handleSave = () => {
        alert("Đã lưu các thay đổi cấu hình hệ thống thành công!");
        navigate('/login/dashboard');
    };

    return (
        <div className="settings-page">
            {/* Header */}
            {/* Header chuẩn giống hình ảnh */}
            <header className="stats-top-bar">
                <div className="top-bar-left">
                    <button type="button" className="cardpage-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>
                </div>

                <h1 className="stats-page-title">Cài đặt hệ thống</h1>

                <div className="top-bar-right">
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="bell-badge-dot"></span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">settings</span>
                    </button>

                    <div className="header-user-profile">
                        <div className="profile-info-text">
                            <span className="profile-user-name">Admin User</span>
                            <span className="profile-user-role">SUPER ADMINISTRATOR</span>
                        </div>
                        <div className="profile-avatar-circle">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Form Content */}
            <div className="settings-content">
                {/* 1. Thông tin hệ thống */}
                <section className="settings-section-card">
                    <div className="settings-section-header">
                        <div className="settings-section-icon orange-bg">
                            <span className="material-symbols-outlined text-orange">info</span>
                        </div>
                        <h2>Thông tin hệ thống</h2>
                    </div>

                    <div className="settings-section-body">
                        <div className="settings-row">
                            <div className="settings-group">
                                <label>Đường dẫn lưu ảnh Camera (Vào)</label>
                                <div className="input-with-button">
                                    <input
                                        type="text"
                                        value={cameraInPath}
                                        onChange={(e) => setCameraInPath(e.target.value)}
                                    />
                                    <button type="button" className="settings-browse-btn">
                                        <span className="material-symbols-outlined">folder_open</span>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-group">
                                <label>Đường dẫn lưu ảnh Camera (Ra)</label>
                                <div className="input-with-button">
                                    <input
                                        type="text"
                                        value={cameraOutPath}
                                        onChange={(e) => setCameraOutPath(e.target.value)}
                                    />
                                    <button type="button" className="settings-browse-btn">
                                        <span className="material-symbols-outlined">folder_open</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="settings-logo-row">
                            <label className="logo-label-title">Logo hệ thống</label>
                            <div className="logo-upload-container">
                                <div className="logo-preview-box">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="System Logo" className="uploaded-logo-img" />
                                    ) : (
                                        <span className="material-symbols-outlined">image</span>
                                    )}
                                </div>
                                <div className="logo-upload-actions">
                                    <label className="logo-upload-btn">
                                        Tải ảnh lên
                                        <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                                    </label>
                                    <span className="logo-upload-tip">Định dạng hỗ trợ: JPG, PNG. Tối đa 2MB.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Thiết bị ngoại vi */}
                <section className="settings-section-card">
                    <div className="settings-section-header">
                        <div className="settings-section-icon orange-bg">
                            <span className="material-symbols-outlined text-orange">devices</span>
                        </div>
                        <h2>Thiết bị ngoại vi</h2>
                    </div>

                    <div className="settings-section-body">
                        {/* Cấu hình Đầu đọc thẻ */}
                        <div className="settings-sub-panel">
                            <h3>Cấu hình Đầu đọc thẻ</h3>
                            <div className="settings-row">
                                <div className="settings-group">
                                    <label>Cổng kết nối (COM Port) - Làn Vào</label>
                                    <div className="select-wrapper">
                                        <select value={comPortIn} onChange={(e) => setComPortIn(e.target.value)}>
                                            <option value="COM 1">COM 1</option>
                                            <option value="COM 2">COM 2</option>
                                            <option value="COM 3">COM 3</option>
                                            <option value="COM 4">COM 4</option>
                                            <option value="COM 5">COM 5</option>
                                            <option value="COM 6">COM 6</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <label>Cổng kết nối (COM Port) - Làn Ra</label>
                                    <div className="select-wrapper">
                                        <select value={comPortOut} onChange={(e) => setComPortOut(e.target.value)}>
                                            <option value="COM 1">COM 1</option>
                                            <option value="COM 2">COM 2</option>
                                            <option value="COM 3">COM 3</option>
                                            <option value="COM 4">COM 4</option>
                                            <option value="COM 5">COM 5</option>
                                            <option value="COM 6">COM 6</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cấu hình Camera (RTSP) */}
                        <div className="settings-sub-panel">
                            <h3>Cấu hình Camera (RTSP)</h3>
                            <div className="settings-row">
                                <div className="settings-group">
                                    <label>Luồng Video - Biển số Làn Vào</label>
                                    <input
                                        type="text"
                                        value={cameraInPlate}
                                        onChange={(e) => setCameraInPlate(e.target.value)}
                                    />
                                </div>
                                <div className="settings-group">
                                    <label>Luồng Video - Toàn cảnh Làn Vào</label>
                                    <input
                                        type="text"
                                        value={cameraInPanorama}
                                        onChange={(e) => setCameraInPanorama(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="settings-row mt-16">
                                <div className="settings-group">
                                    <label>Luồng Video - Biển số Làn Ra</label>
                                    <input
                                        type="text"
                                        value={cameraOutPlate}
                                        onChange={(e) => setCameraOutPlate(e.target.value)}
                                    />
                                </div>
                                <div className="settings-group">
                                    <label>Luồng Video - Toàn cảnh Làn Ra</label>
                                    <input
                                        type="text"
                                        value={cameraOutPanorama}
                                        onChange={(e) => setCameraOutPanorama(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Cấu hình vận hành */}
                <section className="settings-section-card">
                    <div className="settings-section-header">
                        <div className="settings-section-icon orange-bg">
                            <span className="material-symbols-outlined text-orange">settings_suggest</span>
                        </div>
                        <h2>Cấu hình vận hành</h2>
                    </div>

                    <div className="settings-section-body">
                        {/* Toggle 1 */}
                        <div className="settings-toggle-row">
                            <div className="toggle-info">
                                <span className="toggle-title">Tự động mở Barie (Làn Vào)</span>
                                <span className="toggle-desc">Hệ thống sẽ tự động gửi lệnh mở barie khi quẹt thẻ hợp lệ.</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={autoOpenBarieIn}
                                    onChange={(e) => setAutoOpenBarieIn(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {/* Toggle 2 */}
                        <div className="settings-toggle-row">
                            <div className="toggle-info">
                                <span className="toggle-title">Tự động mở Barie (Làn Ra)</span>
                                <span className="toggle-desc">Yêu cầu thẻ hợp lệ và khớp biển số để tự động mở.</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={autoOpenBarieOut}
                                    onChange={(e) => setAutoOpenBarieOut(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <hr className="settings-divider" />

                        {/* Numeric Inputs */}
                        <div className="settings-row">
                            <div className="settings-group">
                                <label>Thời gian lưu trữ hình ảnh (Ngày)</label>
                                <input
                                    type="number"
                                    value={storageDays}
                                    onChange={(e) => setStorageDays(Number(e.target.value))}
                                />
                                <span className="input-tip-desc">Hệ thống sẽ tự động dọn dẹp ảnh cũ hơn thời gian này.</span>
                            </div>

                            <div className="settings-group">
                                <label>Biên độ sai lệch biển số cho phép (Ký tự)</label>
                                <input
                                    type="number"
                                    value={plateDeviationLimit}
                                    onChange={(e) => setPlateDeviationLimit(Number(e.target.value))}
                                />
                                <span className="input-tip-desc">Dùng cho tính năng tự động so khớp khi ra cổng.</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Form Actions */}
                <div className="settings-actions">
                    <button type="button" className="settings-cancel-btn" onClick={() => navigate('/login/dashboard')}>
                        Hủy bỏ
                    </button>
                    <button type="button" className="settings-save-btn" onClick={handleSave}>
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
