// // import { useState } from "react";
// // import supabase from "../../../config/supabaseClient";

// // export default function ForgotPassword() {

// //     const [email, setEmail] = useState("");
// //     const [message, setMessage] = useState("");
// //     const [loading, setLoading] = useState(false);

// //     const handleReset = async (e) => {

// //         e.preventDefault();

// //         setLoading(true);
// //         setMessage("");

// //         const { error } =
// //             await supabase.auth.resetPasswordForEmail(
// //                 email,
// //                 {
// //                     redirectTo:
// //                         "http://localhost:5173/reset-password",
// //                 }
// //             );

// //         if (error) {
// //             setMessage(error.message);
// //         } else {
// //             setMessage(
// //                 "Password reset email has been sent."
// //             );
// //         }

// //         setLoading(false);
// //     };

// //     return (
// //         <div className="login-layout">

// //             <div className="login-card">

// //                 <h2>Forgot Password</h2>

// //                 <form onSubmit={handleReset}>

// //                     <input
// //                         type="email"
// //                         placeholder="Enter your email"
// //                         value={email}
// //                         onChange={(e) =>
// //                             setEmail(e.target.value)
// //                         }
// //                         required
// //                     />

// //                     <button
// //                         type="submit"
// //                         disabled={loading}
// //                     >
// //                         {loading
// //                             ? "Sending..."
// //                             : "Send Reset Link"}
// //                     </button>

// //                 </form>

// //                 {message && (
// //                     <p>{message}</p>
// //                 )}

// //             </div>

// //         </div>
// //     );
// // } 
// import { useState } from "react";
// import { useAuth } from "../../../context/AuthContext";
// import { useEffect, useState } from "react";
// export default function ForgotPassword() {

//     const { forgotPassword } = useAuth();

//     const [email, setEmail] = useState("");
//     const [message, setMessage] = useState("");
//     const [loading, setLoading] = useState(false);
//     const [cooldown, setCooldown] = useState(0);
//     const handleSubmit = async (e) => {

//         e.preventDefault();

//         try {

//             setLoading(true);

//             // await forgotPassword(email);

//             // setMessage(
//             //     "Password reset link has been sent to your email."
//             // );
//             await forgotPassword(email);

//             setMessage(
//                 "Password reset link has been sent."
//             );

//             setCooldown(60);
//         } catch (err) {

//             setMessage(err.message);

//         } finally {

//             setLoading(false);

//         }
//     };

//     useEffect(() => {

//         if (cooldown <= 0) return;

//         const timer = setInterval(() => {

//             setCooldown(prev => prev - 1);

//         }, 1000);

//         return () => clearInterval(timer);

//     }, [cooldown]);

//     return (
//         <div className="login-layout">

//             <div className="login-card">

//                 <h2>Forgot Password</h2>

//                 <form onSubmit={handleSubmit}>

//                     <input
//                         type="email"
//                         placeholder="Enter your email"
//                         value={email}
//                         onChange={(e) =>
//                             setEmail(e.target.value)
//                         }
//                         className="login-input"
//                     />

//                     <button
//                         type="submit"
//                         className="login-submit-button"
//                     >
//                         {
//                             loading
//                                 ? "Sending..."
//                                 : "Send Reset Link"
//                         }
//                     </button>

//                 </form>

//                 {
//                     message &&
//                     <p>{message}</p>
//                 }

//             </div>

//         </div>
//     );
// }    

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Link } from "react-router-dom";

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