// Import useState để quản lý state mật khẩu mới, xác nhận mật khẩu và thông báo
import { useState } from "react";
// Import useAuth để lấy hàm updatePassword (cập nhật mật khẩu qua Supabase)
import { useAuth } from "../../../context/AuthContext";
// Import useNavigate để điều hướng về trang login sau khi đổi mật khẩu thành công
import { useNavigate } from "react-router-dom";
// Import useNotification để hiển thị toast thông báo thành công
import { useNotification } from "../../../context/NotificationContext";
// Import CSS riêng của trang Reset Password
import "./ResetPassword.css";

// Trang Đặt lại mật khẩu — người dùng vào đây sau khi click link reset trong email
export default function ResetPassword() {

    // Hook điều hướng — dùng để chuyển về /login sau khi đổi mật khẩu xong
    const navigate = useNavigate();
    // Lấy hàm showToast để hiển thị toast thông báo thành công
    const { showToast } = useNotification();

    // Lấy hàm updatePassword từ AuthContext (gọi supabase.auth.updateUser)
    const { updatePassword } = useAuth();

    // State lưu mật khẩu mới người dùng nhập vào
    const [password, setPassword] = useState("");
    // State lưu mật khẩu xác nhận (phải trùng với password)
    const [confirm, setConfirm] = useState("");

    // State lưu thông báo lỗi (hiển thị dưới form)
    const [message, setMessage] = useState("");

    // Xử lý submit form đổi mật khẩu
    const handleSubmit = async (e) => {

        e.preventDefault(); // Ngăn browser reload trang

        // Kiểm tra 2 mật khẩu có trùng nhau không
        if (password !== confirm) {

            setMessage(
                "Passwords do not match" // Hiển thị lỗi mật khẩu không khớp
            );

            return; // Dừng xử lý, không gửi request
        }

        try {

            // Gọi Supabase updateUser để cập nhật mật khẩu mới
            await updatePassword(password);

            // Hiển thị toast thành công (màu xanh lá)
            showToast(
                "Password updated successfully",
                "success"
            );

            // Điều hướng về trang đăng nhập sau khi đổi mật khẩu thành công
            navigate("/login");

        } catch (err) {

            // Hiển thị thông báo lỗi từ Supabase
            setMessage(err.message);

        }

    };

    return (

        // Wrapper layout toàn màn hình
        <div className="login-layout">

            {/* Card form đặt lại mật khẩu */}
            <div className="login-card">

                <h2>Reset Password</h2>

                {/* Form nhập mật khẩu mới */}
                <form onSubmit={handleSubmit}>

                    {/* Input mật khẩu mới */}
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        className="login-input"
                    />

                    {/* Input xác nhận mật khẩu */}
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirm}
                        onChange={(e) =>
                            setConfirm(
                                e.target.value
                            )
                        }
                        className="login-input"
                    />

                    {/* Nút submit cập nhật mật khẩu */}
                    <button
                        type="submit"
                        className="login-submit-button"
                    >
                        Update Password
                    </button>

                </form>

                {/* Hiển thị thông báo lỗi nếu có (sau khi submit thất bại) */}
                {
                    message &&
                    <p>{message}</p>
                }

            </div>

        </div>

    );
}