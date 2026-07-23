import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../config/supabaseClient";

export default function SetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            if (error || !data.session) {
                setError("Link mời không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên gửi lại lời mời.");
            }
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        try {
            setLoading(true);
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message || "Lỗi khi cập nhật mật khẩu.");
                return;
            }

            setSuccess(true);
            await supabase.auth.signOut().catch(() => {});
            setTimeout(() => { navigate("/login"); }, 2000);
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sp-layout">
            {/* Full-screen background image */}
            <img src="/parking-bg.png" alt="" className="sp-bg-image" />

            {/* Dark overlay toàn màn hình */}
            <div className="sp-bg-overlay" />

            {/* Form card giữa trang */}
            <div className="sp-center-card">
                {/* Logo / brand */}
                <div className="sp-brand-row">
                    <div className="sp-lock-icon">
                        <span className="material-symbols-outlined">lock_reset</span>
                    </div>
                    <div>
                        <div className="sp-brand-name">ParkingPro</div>
                        <div className="sp-brand-sub">Hệ thống quản lý bãi đỗ xe</div>
                    </div>
                </div>

                <h2 className="sp-title">Thiết lập mật khẩu tài khoản</h2>
                <p className="sp-subtitle">Vui lòng tạo mật khẩu mới để bắt đầu sử dụng hệ thống</p>

                {success ? (
                    <div className="sp-success-box">
                        <span className="material-symbols-outlined sp-success-icon">check_circle</span>
                        Đặt mật khẩu thành công! Đang chuyển đến trang đăng nhập...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="sp-form">
                        {/* Mật khẩu mới */}
                        <div className="sp-input-group">
                            <label className="sp-label">
                                Mật khẩu mới <span className="required-star">*</span>
                            </label>
                            <div className="sp-input-wrapper">
                                <span className="material-symbols-outlined sp-input-icon">lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="sp-input"
                                    required
                                />
                                <button type="button" className="sp-toggle-eye"
                                    onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                                    <span className="material-symbols-outlined">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Xác nhận mật khẩu */}
                        <div className="sp-input-group">
                            <label className="sp-label">
                                Xác nhận mật khẩu <span className="required-star">*</span>
                            </label>
                            <div className="sp-input-wrapper">
                                <span className="material-symbols-outlined sp-input-icon">lock_open</span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Nhập lại mật khẩu mới..."
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="sp-input"
                                    required
                                />
                                <button type="button" className="sp-toggle-eye"
                                    onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                                    <span className="material-symbols-outlined">
                                        {showConfirm ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="sp-error-box">
                                <span className="material-symbols-outlined sp-error-icon">error</span>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="sp-submit-btn" disabled={loading}>
                            {loading ? (
                                <><span className="sp-btn-spinner" /> Đang lưu mật khẩu...</>
                            ) : (
                                <><span className="material-symbols-outlined">check_circle</span> Xác nhận &amp; Đặt mật khẩu</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}