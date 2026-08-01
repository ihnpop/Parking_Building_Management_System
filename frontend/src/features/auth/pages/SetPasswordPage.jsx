// Import useState để quản lý mật khẩu, xác nhận, loading, lỗi, success và trạng thái hiển thị mật khẩu
// Import useEffect để kiểm tra session invite khi component mount
import { useState, useEffect } from "react";
// Import useNavigate để điều hướng về trang login sau khi đặt mật khẩu thành công
import { useNavigate } from "react-router-dom";
// Import client Supabase để gọi updateUser (đặt mật khẩu) và kiểm tra session
import supabase from "../../../config/supabaseClient";
// Import CSS riêng của trang SetPassword
import "./SetPasswordPage.css";

// Trang Đặt mật khẩu lần đầu — dành cho nhân viên được invite qua email bởi Admin
// Người dùng click link trong email → Supabase xử lý token → vào trang này để đặt mật khẩu
export default function SetPasswordPage() {
    // State lưu mật khẩu mới người dùng nhập vào
    const [password, setPassword] = useState("");
    // State lưu mật khẩu xác nhận (phải trùng với password)
    const [confirmPassword, setConfirmPassword] = useState("");
    // State kiểm soát trạng thái đang gửi request (disable nút và hiển thị spinner)
    const [loading, setLoading] = useState(false);
    // State lưu thông báo lỗi (hiển thị trong hộp đỏ)
    const [error, setError] = useState("");
    // State đánh dấu đặt mật khẩu thành công (hiển thị màn hình success)
    const [success, setSuccess] = useState(false);
    // State kiểm soát hiển thị/ẩn mật khẩu trong input password
    const [showPassword, setShowPassword] = useState(false);
    // State kiểm soát hiển thị/ẩn mật khẩu trong input confirm
    const [showConfirm, setShowConfirm] = useState(false);
    // Hook điều hướng — dùng để redirect về /login sau khi đặt mật khẩu xong
    const navigate = useNavigate();

    // Kiểm tra session invite hợp lệ khi component mount
    // Nếu link đã hết hạn hoặc không hợp lệ, hiển thị thông báo lỗi ngay lập tức
    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            if (error || !data.session) {
                // Session không hợp lệ hoặc đã hết hạn → thông báo lỗi
                setError("Link mời không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên gửi lại lời mời.");
            }
        });
    }, []); // Chỉ chạy 1 lần khi mount

    // Xử lý submit form đặt mật khẩu
    const handleSubmit = async (e) => {
        e.preventDefault(); // Ngăn browser reload trang
        setError(""); // Xóa lỗi cũ

        // Validate: mật khẩu phải có ít nhất 6 ký tự
        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        // Validate: 2 mật khẩu phải trùng nhau
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        try {
            setLoading(true); // Bật loading

            // Gọi Supabase updateUser để cập nhật mật khẩu mới cho tài khoản đã đăng nhập bằng invite token
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                // Hiển thị lỗi từ Supabase nếu cập nhật thất bại
                setError(updateError.message || "Lỗi khi cập nhật mật khẩu.");
                return;
            }

            // Đặt mật khẩu thành công: chuyển sang màn hình success
            setSuccess(true);
            // Đăng xuất khỏi phiên invite (người dùng cần đăng nhập lại bằng email + mật khẩu vừa tạo)
            await supabase.auth.signOut().catch(() => {}); // Bỏ qua lỗi signOut
            // Chờ 2 giây cho người dùng đọc thông báo, rồi redirect về trang login
            setTimeout(() => { navigate("/login"); }, 2000);
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setLoading(false); // Tắt loading dù thành công hay thất bại
        }
    };

    return (
        // Wrapper layout toàn màn hình
        <div className="sp-layout">
            {/* Ảnh nền toàn màn hình — dùng ảnh bãi đỗ xe */}
            <img src="/parking-bg.png" alt="" className="sp-bg-image" />

            {/* Lớp overlay tối phủ lên ảnh nền để form dễ đọc hơn */}
            <div className="sp-bg-overlay" />

            {/* Card form chứa form đặt mật khẩu */}
            <div className="sp-center-card">
                {/* Hàng logo / brand của hệ thống */}
                <div className="sp-brand-row">
                    {/* Icon khóa reset */}
                    <div className="sp-lock-icon">
                        <span className="material-symbols-outlined">lock_reset</span>
                    </div>
                    <div>
                        {/* Tên hệ thống */}
                        <div className="sp-brand-name">ParkingPro</div>
                        {/* Phụ đề mô tả */}
                        <div className="sp-brand-sub">Hệ thống quản lý bãi đỗ xe</div>
                    </div>
                </div>

                {/* Tiêu đề trang */}
                <h2 className="sp-title">Thiết lập mật khẩu tài khoản</h2>
                {/* Hướng dẫn ngắn gọn */}
                <p className="sp-subtitle">Vui lòng tạo mật khẩu mới để bắt đầu sử dụng hệ thống</p>

                {/* Hiển thị màn hình thành công hoặc form đặt mật khẩu */}
                {success ? (
                    // Màn hình thành công: icon check + thông báo đang chuyển hướng
                    <div className="sp-success-box">
                        <span className="material-symbols-outlined sp-success-icon">check_circle</span>
                        Đặt mật khẩu thành công! Đang chuyển đến trang đăng nhập...
                    </div>
                ) : (
                    // Form đặt mật khẩu
                    <form onSubmit={handleSubmit} className="sp-form">
                        {/* Nhóm input Mật khẩu mới */}
                        <div className="sp-input-group">
                            <label className="sp-label">
                                Mật khẩu mới <span className="required-star">*</span>
                            </label>
                            {/* Wrapper chứa icon, input và nút toggle hiển thị mật khẩu */}
                            <div className="sp-input-wrapper">
                                {/* Icon khóa bên trái input */}
                                <span className="material-symbols-outlined sp-input-icon">lock</span>
                                {/* Input mật khẩu — type thay đổi theo showPassword */}
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="sp-input"
                                    required
                                />
                                {/* Nút toggle hiện/ẩn mật khẩu — tabIndex=-1 để không ảnh hưởng Tab navigation */}
                                <button type="button" className="sp-toggle-eye"
                                    onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                                    <span className="material-symbols-outlined">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Nhóm input Xác nhận mật khẩu */}
                        <div className="sp-input-group">
                            <label className="sp-label">
                                Xác nhận mật khẩu <span className="required-star">*</span>
                            </label>
                            <div className="sp-input-wrapper">
                                {/* Icon khóa mở bên trái */}
                                <span className="material-symbols-outlined sp-input-icon">lock_open</span>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Nhập lại mật khẩu mới..."
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="sp-input"
                                    required
                                />
                                {/* Nút toggle hiện/ẩn mật khẩu xác nhận */}
                                <button type="button" className="sp-toggle-eye"
                                    onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                                    <span className="material-symbols-outlined">
                                        {showConfirm ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Hộp thông báo lỗi — chỉ hiện khi có lỗi */}
                        {error && (
                            <div className="sp-error-box">
                                <span className="material-symbols-outlined sp-error-icon">error</span>
                                {error}
                            </div>
                        )}

                        {/* Nút submit — disabled khi đang loading */}
                        <button type="submit" className="sp-submit-btn" disabled={loading}>
                            {loading ? (
                                // Trạng thái loading: spinner + text
                                <><span className="sp-btn-spinner" /> Đang lưu mật khẩu...</>
                            ) : (
                                // Trạng thái bình thường: icon check + text
                                <><span className="material-symbols-outlined">check_circle</span> Xác nhận &amp; Đặt mật khẩu</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}