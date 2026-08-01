// Import useState: quản lý email, password, lỗi, loading, trạng thái show/hide password
import { useState } from "react";
// Import useNavigate để điều hướng về dashboard sau khi đăng nhập thành công
import { useNavigate, Link } from "react-router-dom";
// Import axios để gọi API đăng nhập backend
import axios from "axios";
// Import useAuth để lấy hàm loginWithGoogle
import { useAuth } from "../../../context/AuthContext";
// Import client Supabase để đồng bộ session phía client sau khi đăng nhập
import supabase from "../../../config/supabaseClient";
// Import CSS riêng của trang Login
import "./LoginPage.css";

// Trang Đăng nhập chính — hỗ trợ cả email/password lẫn Google OAuth
export default function LoginPage() {
    // Hook điều hướng — dùng sau khi đăng nhập thành công để chuyển về dashboard
    const navigate = useNavigate();
    // Lấy hàm loginWithGoogle từ AuthContext để kích hoạt luồng Google OAuth
    const { loginWithGoogle, logout } = useAuth();
    // State lưu email người dùng nhập vào
    const [email, setEmail] = useState("");
    // State lưu mật khẩu người dùng nhập vào
    const [password, setPassword] = useState("");
    // State lưu thông báo lỗi đăng nhập (hiển thị trong hộp đỏ)
    const [error, setError] = useState("");
    // State kiểm soát trạng thái đang gửi request (disable button và đổi text)
    const [loading, setLoading] = useState(false);
    // State kiểm soát hiển thị / ẩn mật khẩu trong input
    const [showPassword, setShowPassword] = useState(false);

    // AuthContext.getSession() đã xử lý cleanup khi không có session hợp lệ.
    // Không gọi logout() ở đây để tránh race condition khi cold-start.

    // Xử lý submit form đăng nhập email/password
    const handleSubmit = async (e) => {
        e.preventDefault(); // Ngăn browser reload trang
        setError(""); // Xóa lỗi cũ
        // Validate: cả email và password đều phải được nhập
        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }
        try {
            setLoading(true); // Bật trạng thái loading
            // Gọi API đăng nhập backend (trả về session Supabase)
            // const response = await axios.post("http://localhost:3636/api/login", { // (đã comment) — URL cứng
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
                email,
                password,
            });
            console.log("Login Success:", response.data);
            // Trích xuất access_token từ nhiều cấu trúc response khác nhau (hỗ trợ backward compatibility)
            const token =
                response.data?.session?.access_token ||
                response.data?.access_token ||
                response.data?.token;
            // Trích xuất refresh_token để gia hạn session tự động
            const refreshToken = response.data?.session?.refresh_token;

            // Ném lỗi nếu backend không trả về token
            if (!token) {
                throw new Error("Token not found in response");
            }
            // Đồng bộ session với Supabase SDK phía client để interceptors hoạt động đúng
            if (response.data?.session) {
                // Nếu backend trả về session đầy đủ, dùng setSession trực tiếp
                const { error: setSessionError } = await supabase.auth.setSession(response.data.session);
                if (setSessionError) throw setSessionError;
            } else {
                // Fallback: tạo session từ access_token và refresh_token riêng lẻ
                await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken || ""
                });
            }
            // Lưu token vào localStorage với 3 key khác nhau để đảm bảo tương thích với tất cả API files
            localStorage.setItem("token", token);
            localStorage.setItem("accessToken", token);
            localStorage.setItem("access_token", token);
            // Lưu email để hiển thị trên Topbar và Sidebar
            localStorage.setItem("userEmail", email);
            // Lưu userId từ response (hỗ trợ 2 cấu trúc response)
            if (response.data?.user?.id) {
                localStorage.setItem("userId", response.data.user.id);
            } else if (response.data?.session?.user?.id) {
                localStorage.setItem("userId", response.data.session.user.id);
            }

            // Xóa tab đã lưu từ phiên trước để khi đăng nhập mới luôn hiển thị tab đầu tiên của sidebar
            localStorage.removeItem("dashboard_current_view");

            // Đồng bộ phiên đăng nhập với client Supabase trên frontend (lần 2 để đảm bảo token mới được áp dụng)
            if (refreshToken) {
                await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken,
                });
            }

            // Điều hướng về dashboard sau khi đăng nhập thành công (replace=true để không thể back về login)
            navigate("/login/dashboard", { replace: true });
        } catch (err) {
            console.error(err);
            // Hiển thị thông báo lỗi từ server hoặc message mặc định
            setError(
                err.response?.data?.message || err.message || "Login Failed"
            );
        } finally {
            setLoading(false); // Tắt loading dù thành công hay thất bại
        }
    };

    return (
        // Container ngoài cùng của trang login
        <div className="new-login-container">
            {/* Lớp blur background trang trí */}
            <div className="bg-blur-container"></div>

            {/* Card chính chia đôi: trái (hero) và phải (form) */}
            <main className="main-card">
                {/* === PANEL TRÁI: Hình ảnh / slogan hệ thống === */}
                <section className="left-panel">
                    <div className="inner-visual">
                        {/* Logo và tên thương hiệu */}
                        <div className="left-panel-top">
                            <span className="brand-text">ParkFlow</span>
                        </div>
                        {/* Slogan và mô tả ngắn */}
                        <div className="left-panel-bottom">
                            <h1 className="hero-title">
                                SMART PARKING<br />MANAGEMENT
                            </h1>
                            <p className="hero-subtitle">
                                Hệ thống quản lý bãi đỗ xe thông minh giúp giám sát, vận hành và tối ưu hóa lưu lượng xe theo thời gian thực.
                            </p>
                        </div>
                    </div>
                </section>

                {/* === PANEL PHẢI: Form đăng nhập === */}
                <section className="right-panel">
                    <div className="form-container">
                        {/* Header form: tiêu đề và phụ đề */}
                        <header className="form-header">
                            <h2 className="form-title">CHÀO MỪNG QUAY LẠI !</h2>
                            <p className="form-subtitle">Đăng nhập để tiếp tục quản lý hệ thống bãi đỗ xe.</p>
                        </header>

                        {/* Hộp thông báo lỗi — chỉ hiện khi có lỗi */}
                        {error && (
                            <div className="error-alert">
                                {error}
                            </div>
                        )}

                        {/* Form đăng nhập */}
                        <form className="login-form-element" onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email</label>
                                <input
                                    className="input-standard"
                                    id="email"
                                    placeholder="admin@gmail.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)} // Cập nhật state email khi gõ
                                    required
                                />
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <div className="label-row">
                                    <label className="form-label" htmlFor="password">Mật khẩu</label>
                                    {/* Link quên mật khẩu */}
                                    <Link className="forgot-link" to="/forgot-password">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                {/* Wrapper bao gồm input + nút toggle hiện/ẩn */}
                                <div className="password-input-wrapper">
                                    <input
                                        className="input-standard"
                                        id="password"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"} // Toggle giữa text và password
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)} // Cập nhật state password
                                        required
                                    />
                                    {/* Nút toggle hiện/ẩn mật khẩu */}
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)} // Toggle trạng thái
                                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {/* Icon SVG thay đổi theo trạng thái showPassword */}
                                        <svg className="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {showPassword ? (
                                                // Icon mắt mở (đang hiển thị mật khẩu)
                                                <>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </>
                                            ) : (
                                                // Icon mắt gạch chéo (đang ẩn mật khẩu)
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Nút Submit đăng nhập — disabled khi đang loading */}
                            <button
                                className="btn-standard submit-btn"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
                            </button>

                            {/* Nút Đăng nhập bằng Google — gọi loginWithGoogle từ AuthContext */}
                            <button
                                className="btn-standard google-btn"
                                type="button"
                                onClick={loginWithGoogle} // Kích hoạt luồng Google OAuth
                                disabled={loading}
                            >
                                {/* Logo Google SVG (4 màu chuẩn của Google) */}
                                <svg className="google-icon" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                </svg>
                                <span className="google-text">Đăng nhập với Google</span>
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}