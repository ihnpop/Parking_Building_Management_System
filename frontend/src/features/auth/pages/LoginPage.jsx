import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginPage() {
    const navigate = useNavigate();
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
            const response = await axios.post("http://localhost:5000/api/login", {
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