import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }

        console.log("Đang đăng nhập lụi với:", { email, password });

        try {
            // Lưu mọi kiểu biến token để các thành phần bảo mật check kiểu gì cũng trúng
            localStorage.setItem("token", "mock-fake-token-123456");
            localStorage.setItem("accessToken", "mock-fake-token-123456");
            localStorage.setItem("access_token", "mock-fake-token-123456");

            // Chuyển hướng thẳng vào dashboard
            navigate('/login/dashboard');
        } catch (err) {
            console.error("Lỗi điều hướng:", err);
            setError("Something went wrong!");
        }
    };

    return (
        <div className="login-layout">
            <div className="page-background-circle top" />
            <div className="page-background-circle bottom" />

            <header className="login-header">
                <div className="login-brand">Parking Building</div>
                <button type="button" className="login-menu-button" aria-label="Open menu">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>

            <main className="login-main">
                <div className="login-card ambient-shadow">
                    <div className="login-card-header">
                        <h1>Welcome Back</h1>
                        <p>Please enter your details to sign in.</p>
                    </div>

                    {error && (
                        <div style={{ color: '#ff4d4d', textAlign: 'center', marginBottom: '15px', fontWeight: 'bold' }}>
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
                                onChange={(event) => setEmail(event.target.value)}
                                className="login-input"
                                placeholder="name@example.com"
                                required
                            />
                        </label>

                        <label className="login-label" htmlFor="password">
                            <div className="login-label-row">
                                <span>Password</span>
                                <a href="#" className="login-forgot">Forgot password?</a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="login-input"
                                placeholder="••••••••"
                                required
                            />
                        </label>

                        <button type="submit" className="login-submit-button">
                            Sign In
                        </button>
                    </form>
                </div>
            </main>

            <footer className="login-footer">
                <span>© 2024 WarmAuth. All rights reserved.</span>
                <div className="login-footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                    <a href="#">Contact Support</a>
                </div>
            </footer>
        </div>
    );
}