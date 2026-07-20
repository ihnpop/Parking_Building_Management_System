import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import supabase from "../../../config/supabaseClient";
import "./LoginPage.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const { loginWithGoogle, logout } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // AuthContext.getSession() đã xử lý cleanup khi không có session hợp lệ.
    // Không gọi logout() ở đây để tránh race condition khi cold-start.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }
        try {
            setLoading(true);
            // const response = await axios.post("http://localhost:3636/api/login", { đổi dòng này**************
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
                email,
                password,
            });
            console.log("Login Success:", response.data);
            const token =
                response.data?.session?.access_token ||
                response.data?.access_token ||
                response.data?.token;
            const refreshToken = response.data?.session?.refresh_token;

            if (!token) {
                throw new Error("Token not found in response");
            }
            if (response.data?.session) {
                const { error: setSessionError } = await supabase.auth.setSession(response.data.session);
                if (setSessionError) throw setSessionError;
            } else {
                await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken || ""
                });
            }
            localStorage.setItem("token", token);
            localStorage.setItem("accessToken", token);
            localStorage.setItem("access_token", token);

            // Xóa tab đã lưu từ phiên trước để khi đăng nhập mới luôn hiển thị tab đầu tiên của sidebar
            localStorage.removeItem("dashboard_current_view");

            // Đồng bộ phiên đăng nhập với client Supabase trên frontend
            if (refreshToken) {
                await supabase.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken,
                });
            }

            navigate("/login/dashboard", { replace: true });
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message || err.message || "Login Failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-login-container">
            <div className="bg-blur-container"></div>

            <main className="main-card">
                {/* Left Side: Hero Area */}
                <section className="left-panel">
                    <div className="inner-visual">
                        <div className="left-panel-top">
                            <span className="brand-text">ParkFlow</span>
                        </div>
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

                {/* Right Side: Login Form */}
                <section className="right-panel">
                    <div className="form-container">
                        <header className="form-header">
                            <h2 className="form-title">CHÀO MỪNG QUAY LẠI !</h2>
                            <p className="form-subtitle">Đăng nhập để tiếp tục quản lý hệ thống bãi đỗ xe.</p>
                        </header>

                        {error && (
                            <div className="error-alert">
                                {error}
                            </div>
                        )}

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
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <div className="label-row">
                                    <label className="form-label" htmlFor="password">Mật khẩu</label>
                                    <Link className="forgot-link" to="/forgot-password">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div className="password-input-wrapper">
                                    <input
                                        className="input-standard"
                                        id="password"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        <svg className="eye-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {showPassword ? (
                                                <>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </>
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                className="btn-standard submit-btn"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
                            </button>

                            {/* Google Button */}
                            <button
                                className="btn-standard google-btn"
                                type="button"
                                onClick={loginWithGoogle}
                                disabled={loading}
                            >
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