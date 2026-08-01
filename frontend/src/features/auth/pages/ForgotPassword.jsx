// Import useState để quản lý email, thông báo, lỗi, trạng thái loading và cooldown
// Import useEffect để restore cooldown sau khi reload trang và chạy countdown timer
import { useEffect, useState } from "react";
// Import useAuth để lấy hàm forgotPassword gửi email reset
import { useAuth } from "../../../context/AuthContext";
// Import Link để tạo liên kết quay lại trang đăng nhập
import { Link } from "react-router-dom";
// Import CSS riêng của trang ForgotPassword
import "./ForgotPassword.css";

// Trang Quên mật khẩu: cho phép người dùng nhập email để nhận link reset mật khẩu
export default function ForgotPassword() {

    // Lấy hàm forgotPassword từ AuthContext (gọi Supabase API gửi email reset)
    const { forgotPassword } = useAuth();

    // State lưu email người dùng nhập vào
    const [email, setEmail] = useState("");
    // State lưu thông báo thành công (xanh lá)
    const [message, setMessage] = useState("");
    // State lưu thông báo lỗi (đỏ)
    const [error, setError] = useState("");
    // State kiểm soát trạng thái đang gửi request (hiển thị "Sending...")
    const [loading, setLoading] = useState(false);
    // State đếm ngược cooldown (giây) — ngăn người dùng spam nút gửi liên tục
    const [cooldown, setCooldown] = useState(0);

    // Restore cooldown after refresh — khôi phục thời gian cooldown còn lại sau khi reload trang
    useEffect(() => {
        // Đọc thời điểm hết hạn cooldown từ localStorage
        const expireTime =
            localStorage.getItem("resetCooldown");

        if (!expireTime) return; // Không có cooldown đang chạy

        // Tính số giây còn lại từ bây giờ đến hết hạn
        const remaining =
            Math.floor(
                (Number(expireTime) - Date.now()) / 1000
            );

        // Chỉ khôi phục nếu cooldown còn dương
        if (remaining > 0) {
            setCooldown(remaining);
        }

    }, []); // Chỉ chạy 1 lần khi component mount

    // Countdown — đếm ngược cooldown mỗi giây cho đến khi về 0
    useEffect(() => {

        if (cooldown <= 0) return; // Không cần chạy nếu cooldown đã hết

        // Đặt interval đếm ngược mỗi giây
        const timer = setInterval(() => {

            setCooldown((prev) => {

                if (prev <= 1) {
                    // Cooldown hết: xóa khỏi localStorage và xóa interval
                    localStorage.removeItem(
                        "resetCooldown"
                    );

                    clearInterval(timer);

                    return 0; // Reset về 0
                }

                return prev - 1; // Giảm 1 giây mỗi lần

            });

        }, 1000); // Interval 1 giây

        // Cleanup: hủy interval khi component unmount hoặc cooldown thay đổi
        return () => clearInterval(timer);

    }, [cooldown]); // Chạy lại khi cooldown thay đổi

    // Xử lý submit form gửi email reset mật khẩu
    const handleSubmit = async (e) => {

        e.preventDefault(); // Ngăn browser reload trang

        // Xóa thông báo cũ
        setError("");
        setMessage("");

        // Validate: email không được rỗng
        if (!email) {

            setError("Please enter your email.");

            return;
        }

        try {

            setLoading(true); // Bật trạng thái loading

            // Gọi Supabase API gửi email reset mật khẩu
            await forgotPassword(email);

            // Hiển thị thông báo thành công
            setMessage(
                "Password reset link has been sent to your email."
            );

            // Tính thời điểm hết hạn cooldown (60 giây từ bây giờ)
            const expireTime =
                Date.now() + 60 * 1000;

            // Lưu vào localStorage để khôi phục sau khi reload
            localStorage.setItem(
                "resetCooldown",
                expireTime
            );

            // Bắt đầu đếm ngược 60 giây
            setCooldown(60);

        } catch (err) {

            console.error(err);

            // Hiển thị thông báo lỗi từ Supabase hoặc message mặc định
            setError(
                err.message ||
                "Failed to send reset link."
            );

        } finally {

            setLoading(false); // Tắt loading dù thành công hay thất bại

        }
    };

    return (

        // Wrapper layout toàn màn hình
        <div className="login-layout">

            {/* Hình nền trang trí: 2 hình tròn gradient (góc trên và góc dưới) */}
            <div className="page-background-circle top" />
            <div className="page-background-circle bottom" />

            {/* Vùng nội dung chính ở giữa màn hình */}
            <main className="login-main">

                {/* Card form đặt lại mật khẩu */}
                <div className="login-card ambient-shadow">

                    {/* Header card */}
                    <div className="login-card-header">

                        <h1>Forgot Password</h1>

                        {/* Hướng dẫn ngắn gọn */}
                        <p>
                            Enter your email address and
                            we'll send you a password reset link.
                        </p>

                    </div>

                    {/* Thông báo thành công — chỉ hiện khi message có giá trị */}
                    {message && (

                        <div
                            style={{
                                color: "#4CAF50",       // Màu xanh lá thành công
                                textAlign: "center",
                                marginBottom: "15px",
                                fontWeight: "bold",
                            }}
                        >
                            {message}
                        </div>

                    )}

                    {/* Thông báo lỗi — chỉ hiện khi error có giá trị */}
                    {error && (

                        <div
                            style={{
                                color: "#ff4d4d",       // Màu đỏ lỗi
                                textAlign: "center",
                                marginBottom: "15px",
                                fontWeight: "bold",
                            }}
                        >
                            {error}
                        </div>

                    )}

                    {/* Form nhập email */}
                    <form
                        className="login-form"
                        onSubmit={handleSubmit}
                    >

                        {/* Label + Input email */}
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
                                required // Bắt buộc nhập
                            />

                        </label>

                        {/* Nút submit — disabled khi đang loading hoặc đang trong cooldown */}
                        <button
                            type="submit"
                            className="login-submit-button"
                            disabled={
                                loading ||
                                cooldown > 0
                            }
                        >

                            {/* Text nút thay đổi theo trạng thái: loading → cooldown → bình thường */}
                            {
                                loading
                                    ? "Sending..."           // Đang gửi email
                                    : cooldown > 0
                                        ? `Resend in ${cooldown}s` // Đang cooldown — hiển thị đếm ngược
                                        : "Send Reset Link"  // Trạng thái bình thường
                            }

                        </button>

                    </form>

                    {/* Liên kết quay lại trang đăng nhập */}
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