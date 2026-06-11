// import { useState } from "react";
// import { useNavigate } from "react-router-dom";

// export default function LoginPage() {
//     const navigate = useNavigate();
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [error, setError] = useState("");
//     const [showPassword, setShowPassword] = useState(false);


//     const handleSubmit = (e) => {
//         e.preventDefault();
//         setError("");

//         if (!email || !password) {
//             setError("Vui lòng điền đầy đủ email và mật khẩu.");
//             return;
//         }

//         if (!isEmailValid) {
//             setError("Email không đúng định dạng. Vui lòng kiểm tra lại.");
//             return;
//         }

//         const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
//         if (!isPasswordValid) {
//             setError("Mật khẩu chưa đạt tiêu chuẩn bảo mật. Hãy làm theo hướng dẫn bên dưới!");
//             return;
//         }

//         console.log("Đăng nhập thành công với:", { email, password });

//         try {
//             // Lưu mọi kiểu biến token để các thành phần bảo mật check kiểu gì cũng trúng
//             localStorage.setItem("token", "mock-fake-token-123456");
//             localStorage.setItem("accessToken", "mock-fake-token-123456");
//             localStorage.setItem("access_token", "mock-fake-token-123456");

//             // Chuyển hướng thẳng vào dashboard
//             navigate('/login/dashboard');
//         } catch (err) {
//             console.error("Lỗi điều hướng:", err);
//             setError("Đã xảy ra lỗi ngoài ý muốn. Vui lòng thử lại!");
//         }
//     };

//     return (
//         <div className="login-layout">
//             <div className="page-background-circle top" />
//             <div className="page-background-circle bottom" />

//             <header className="login-header">
//                 <div className="login-brand">Parking Building</div>
//                 <button type="button" className="login-menu-button" aria-label="Open menu">
//                     <span className="material-symbols-outlined">menu</span>
//                 </button>
//             </header>

//             <main className="login-main">
//                 <div className="login-card ambient-shadow">
//                     <div className="login-card-header">
//                         <h1>Welcome Back</h1>
//                         <p>Vui lòng điền thông tin để đăng nhập hệ thống.</p>
//                     </div>

//                     {error && (
//                         <div className="login-error-message">
//                             <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
//                             {error}
//                         </div>
//                     )}

//                     <form className="login-form" onSubmit={handleSubmit}>
//                         <label className="login-label" htmlFor="email">
//                             Email
//                             <input
//                                 id="email"
//                                 type="email"
//                                 value={email}
//                                 onChange={(event) => setEmail(event.target.value)}
//                                 className="login-input"
//                                 placeholder="name@example.com"
//                                 required
//                             />
//                         </label>

//                         <label className="login-label" htmlFor="password">
//                             <div className="login-label-row">
//                                 <span>Mật khẩu</span>
//                                 <a href="#" className="login-forgot">Quên mật khẩu?</a>
//                             </div>
//                             <div className="password-input-wrapper">
//                                 <input
//                                     id="password"
//                                     type={showPassword ? "text" : "password"}
//                                     value={password}
//                                     onChange={(event) => setPassword(event.target.value)}
//                                     onFocus={() => setIsFocused(true)}
//                                     className="login-input password-input"
//                                     placeholder="••••••••"
//                                     required
//                                 />
//                                 <button
//                                     type="button"
//                                     className="password-toggle-btn"
//                                     onClick={() => setShowPassword(!showPassword)}
//                                     title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
//                                 >
//                                     <span className="material-symbols-outlined">
//                                         {showPassword ? "visibility_off" : "visibility"}
//                                     </span>
//                                 </button>
//                             </div>
//                         </label>

//                         <button type="submit" className="login-submit-button">
//                             Đăng Nhập
//                         </button>
//                     </form>
//                 </div>
//             </main>

//             <footer className="login-footer">
//                 <span>© 2024 WarmAuth. All rights reserved.</span>
//                 <div className="login-footer-links">
//                     <a href="#">Privacy Policy</a>
//                     <a href="#">Terms of Service</a>
//                     <a href="#">Contact Support</a>
//                 </div>
//             </footer>
//         </div>
//     );
// }


import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import supabase from "../../../config/supabaseClient";
import "./LoginPage.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const { loginWithGoogle } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }
        try {
            setLoading(true);
            const response = await axios.post("http://localhost:3636/api/login", {
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

            // Set session on the client Supabase instance
            await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken || ""
            });

            localStorage.setItem("token", token);
            localStorage.setItem("accessToken", token);
            localStorage.setItem("access_token", token);
            navigate("/login/dashboard");
        } catch (err) {
            console.error(err);
            setError(
                err.response?.data?.message || err.message || "Login Failed"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError("");
            setLoading(true);
            await loginWithGoogle();
        } catch (err) {
            console.error(err);
            setError(err.message || "Google Sign-In failed.");
            setLoading(false);
        }
    };

    return (
        <div className="new-login-container">
            {/* Left Side: Hero Area (55%) */}
            <section className="new-login-left">
                {/* Brand Anchor */}
                <div className="new-login-brand-anchor">
                    <span className="new-login-brand-text">
                        <span className="material-symbols-outlined new-login-brand-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                            domain
                        </span>
                        ParkFlow Management
                    </span>
                </div>
                {/* Hero Image */}
                <div className="new-login-hero-img-container">
                    <img
                        alt="Modern parking facility entrance"
                        className="new-login-hero-img"
                        src="https://cdn.phototourl.com/free/2026-06-11-ea54cb39-78d9-493b-a28f-404e2bd17850.png"
                    />
                    {/* Warm Beige/Orange Overlay */}
                    <div className="new-login-overlay-gradient"></div>
                    <div className="new-login-overlay-color"></div>
                </div>
            </section>

            {/* Right Side: Login Form (45%) */}
            <section className="new-login-right">
                {/* Main Content Container */}
                <div className="new-login-content">
                    <p className="new-login-secure-portal">Secure Access Portal</p>

                    {/* Login Card */}
                    <div className="new-login-card">
                        <div className="new-login-card-header">
                            <h1 className="new-login-title">Welcome Back</h1>
                            <p className="new-login-subtitle">Please enter your details to sign in.</p>
                        </div>

                        {error && (
                            <div className="new-login-error-alert">
                                {error}
                            </div>
                        )}

                        <form className="new-login-form" onSubmit={handleSubmit}>
                            {/* Email Input */}
                            <div className="new-login-form-group">
                                <label className="new-login-label" htmlFor="email">Email</label>
                                <input
                                    className="new-login-input"
                                    id="email"
                                    placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="new-login-form-group">
                                <div className="new-login-label-row">
                                    <label className="new-login-label" htmlFor="password">Password</label>
                                    <a className="new-login-forgot-link" href="#">Forgot password?</a>
                                </div>
                                <input
                                    className="new-login-input"
                                    id="password"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                className="new-login-submit-btn"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Signing In..." : "Sign In"}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="new-login-divider">
                            <div className="new-login-divider-line"></div>
                            <span className="new-login-divider-text">Hoặc đăng nhập bằng</span>
                            <div className="new-login-divider-line"></div>
                        </div>

                        {/* Google SSO */}
                        <button
                            className="new-login-google-btn"
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg className="new-login-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                            </svg>
                            Google
                        </button>
                    </div>
                </div>

                {/* Global Footer */}
                <footer className="new-login-footer">
                    <div className="new-login-footer-content">
                        <span className="new-login-footer-text">© 2024 ParkFlow Systems. All rights reserved.</span>
                        <div className="new-login-footer-links">
                            <a className="new-login-footer-link" href="#">Privacy Policy</a>
                            <a className="new-login-footer-link" href="#">Terms of Service</a>
                            <a className="new-login-footer-link" href="#">Support</a>
                        </div>
                    </div>
                </footer>
            </section>
        </div>
    );
}