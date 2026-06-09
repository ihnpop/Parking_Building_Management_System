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
            const response = await axios.post("http://localhost:3639/api/login", {
                email,
                password,
            });
            console.log("Login Success:", response.data);
            const token =
                response.data?.session?.access_token ||
                response.data?.access_token ||
                response.data?.token;
            if (!token) {
                throw new Error("Token not found in response");
            }
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
        <div className="login-layout">
            <div className="page-background-circle top" />
            <div className="page-background-circle bottom" />

            <header className="login-header">
                <div className="login-brand"> Parking Building </div>
                <button
                    type="button"
                    className="login-menu-button"
                    aria-label="Open menu"
                >
                    <span className="material-symbols-outlined"> menu </span>
                </button>
            </header>

            <main className="login-main">
                <div className="login-card ambient-shadow">
                    <div className="login-card-header">
                        <h1>Welcome Back</h1>
                        <p> Please enter your details to sign in. </p>
                    </div>

                    {error && (
                        <div
                            style={{
                                color: "#ff4d4d",
                                textAlign: "center",
                                marginBottom: "15px",
                                fontWeight: "bold",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <label className="login-label" htmlFor="email">
                            Email
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="login-input"
                                placeholder="name@example.com"
                                required
                            />
                        </label>

                        <label className="login-label" htmlFor="password">
                            <div className="login-label-row">
                                <span>Password</span>
                                <a href="#" className="login-forgot">
                                    Forgot password?
                                </a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                placeholder="••••••••"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="login-submit-button"
                            disabled={loading}
                        >
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    <div className="login-divider">Hoặc đăng nhập bằng</div>

                    <button
                        type="button"
                        className="google-login-btn"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg viewBox="0 0 24 24">
                            <path
                                fill="#EA4335"
                                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.332 2.673 1.391 6.555L5.266 9.765Z"
                            />
                            <path
                                fill="#4285F4"
                                d="M23.49 12.275c0-.825-.075-1.62-.213-2.385H12v4.51h6.46a5.523 5.523 0 0 1-2.4 3.627v3.016h3.878c2.268-2.09 3.552-5.168 3.552-8.768Z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.266 14.235A7.093 7.093 0 0 1 4.909 12c0-.79.135-1.554.357-2.265L1.391 6.52A11.968 11.968 0 0 0 0 12c0 2.01.5 3.905 1.391 5.575l3.875-3.34Z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.955-1.075 7.94-2.915l-3.878-3.016c-1.075.72-2.45 1.15-4.062 1.15-3.12 0-5.766-2.11-6.712-4.945L1.413 17.57C3.36 21.395 7.355 24 12 24Z"
                            />
                        </svg>
                        Google
                    </button>
                </div>
            </main>

            <footer className="login-footer">
                <span> © 2024 WarmAuth. All rights reserved. </span>
                <div className="login-footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Contact Support</a>
                </div>
            </footer>
        </div>
    );
}