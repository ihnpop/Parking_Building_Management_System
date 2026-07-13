import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../config/supabaseClient"; // client dùng anon key, đã có sẵn

export default function SetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Supabase tự đính kèm access_token vào URL hash khi redirect về từ email invite.
    // supabase-js sẽ tự đọc và tạo session tạm để cho phép updateUser().
    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            if (error || !data.session) {
                setError("Link không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại lời mời.");
            }
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
    };

    if (success) {
        return <div>Đặt mật khẩu thành công! Đang chuyển tới trang đăng nhập...</div>;
    }

    return (
        <div style={{ maxWidth: 400, margin: "60px auto" }}>
            <h2>Đặt mật khẩu cho tài khoản</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Mật khẩu mới</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Xác nhận mật khẩu</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? "Đang lưu..." : "Xác nhận"}
                </button>
            </form>
        </div>
    );
}