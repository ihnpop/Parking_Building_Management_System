/**
 * LoginPage hiển thị form đăng nhập đơn giản.
 * Mục đích: học React và điều hướng route.
 * Bất kỳ email / password nào cũng được chấp nhận.
 */
// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'

// export default function LoginPage() {
//   // Lưu giá trị input email và password trong state
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const navigate = useNavigate()

//   // Khi form submit, đi tới route /login/dashboard
//   const handleSubmit = (event) => {
//     event.preventDefault()
//     navigate('/login/dashboard')
//   }

import { useState } from "react";

import { useNavigate } from "react-router-dom";

import axios from "axios";

export default function Login() {

    const navigate = useNavigate()

    const [email, setEmail] = useState("")

    const [password, setPassword] = useState("")

    const [loading, setLoading] = useState(false)

    const [error, setError] = useState("")

    // const handleSubmit = async (e) => {

    //     e.preventDefault()

    //     setError("")

    //     if (!email || !password) {

    //         setError(
    //             "Please fill all fields"
    //         )

    //         return
    //     }

    //     try {

    //         setLoading(true)

    //         const response = await axios.post(

    //             "http://localhost:5000/api/login",

    //             {

    //                 email,

    //                 password

    //             }

    //         );

    //         console.log(response.data);

    //         localStorage.setItem(

    //             "token",

    //             response.data.session.access_token

    //         );

    //         navigate('/login/dashboard');

    //     }
    //     catch (err) {

    //         setError(

    //             err.response?.data?.message ||

    //             "Login Failed"

    //         );

    //     }
    //     finally {

    //         setLoading(false);

    //     }

    // };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!email || !password) {
            alert("Vui lòng nhập bừa email và password để vào!");
            return;
        }

        // Chuyển thẳng sang Dashboard không cần gọi API
        navigate('/login/dashboard');
    };



    return (
        <div className="login-layout">
            <div className="page-background-circle top" />
            <div className="page-background-circle bottom" />
            <header className="login-header">
                <div className="login-brand">Parking Building

                </div>
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
                                onChange={(event) => setPassword(event.target.value)}
                                className="login-input"
                                placeholder="••••••••"
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
    )
}