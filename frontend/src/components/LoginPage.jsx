/**
 * LoginPage hiển thị form đăng nhập đơn giản cho ứng dụng.
 * Người dùng có thể nhập bất kỳ giá trị nào và chuyển đến dashboard.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/login/dashboard')
  }

  return (
    <div className="login-layout">
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

          <div className="login-signup">
            <span>Don't have an account?</span>
            <a href="#">Sign Up</a>
          </div>
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
