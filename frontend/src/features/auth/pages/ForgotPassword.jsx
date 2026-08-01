import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

export default function ForgotPassword() {

    const { forgotPassword } = useAuth();

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Restore cooldown after refresh
    useEffect(() => {

        const expireTime =
            localStorage.getItem("resetCooldown");

        if (!expireTime) return;

        const remaining =
            Math.floor(
                (Number(expireTime) - Date.now()) / 1000
            );

        if (remaining > 0) {
            setCooldown(remaining);
        }

    }, []);

    // Countdown
    useEffect(() => {

        if (cooldown <= 0) return;

        const timer = setInterval(() => {

            setCooldown((prev) => {

                if (prev <= 1) {

                    localStorage.removeItem(
                        "resetCooldown"
                    );

                    clearInterval(timer);

                    return 0;
                }

                return prev - 1;

            });

        }, 1000);

        return () => clearInterval(timer);

    }, [cooldown]);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        if (!email) {

            setError("Please enter your email.");

            return;
        }

        try {

            setLoading(true);

            await forgotPassword(email);

            setMessage(
                "Password reset link has been sent to your email."
            );

            const expireTime =
                Date.now() + 60 * 1000;

            localStorage.setItem(
                "resetCooldown",
                expireTime
            );

            setCooldown(60);

        } catch (err) {

            console.error(err);

            setError(
                err.message ||
                "Failed to send reset link."
            );

        } finally {

            setLoading(false);

        }
    };

    return (

        <div className="login-layout">

            <div className="page-background-circle top" />
            <div className="page-background-circle bottom" />

            <main className="login-main">

                <div className="login-card ambient-shadow">

                    <div className="login-card-header">

                        <h1>Forgot Password</h1>

                        <p>
                            Enter your email address and
                            we'll send you a password reset link.
                        </p>

                    </div>

                    {message && (

                        <div
                            style={{
                                color: "#4CAF50",
                                textAlign: "center",
                                marginBottom: "15px",
                                fontWeight: "bold",
                            }}
                        >
                            {message}
                        </div>

                    )}

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

                    <form
                        className="login-form"
                        onSubmit={handleSubmit}
                    >

                        <label
                            className="login-label"
                            htmlFor="email"
                        >

                            Email

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                className="login-input"
                                placeholder="name@example.com"
                                required
                            />

                        </label>

                        <button
                            type="submit"
                            className="login-submit-button"
                            disabled={
                                loading ||
                                cooldown > 0
                            }
                        >

                            {
                                loading
                                    ? "Sending..."
                                    : cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : "Send Reset Link"
                            }

                        </button>

                    </form>

                    <div
                        style={{
                            marginTop: "20px",
                            textAlign: "center"
                        }}
                    >

                        <Link
                            to="/login"
                            style={{
                                textDecoration: "none"
                            }}
                        >
                            ← Back to Login
                        </Link>

                    </div>

                </div>

            </main>

        </div>

    );
}