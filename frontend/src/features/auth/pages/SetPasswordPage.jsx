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

    // Supabase tự đính kèm access_token vào URL hash/query khi redirect về từ email invite.
    // supabase-js sẽ tự đọc và tạo session tạm để cho phép updateUser().
    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            if (error || !data.session) {
                setError("Link mời không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên gửi lại lời mời.");
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

        try {
            setLoading(true);
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message || "Lỗi khi cập nhật mật khẩu.");
                return;
            }

            setSuccess(true);
            // Sau khi đặt mật khẩu thành công, hoàn tất đăng xuất phiên tạm để quay về đăng nhập chuẩn
            await supabase.auth.signOut().catch(() => {});
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setError(err.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
            <div className="login-card ambient-shadow" style={{ width: '100%', maxWidth: '420px', padding: '32px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#dbeafe', color: '#2563eb', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>lock_reset</span>
                    </div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Thiết lập mật khẩu tài khoản</h2>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Vui lòng tạo mật khẩu mới để bắt đầu sử dụng hệ thống</p>
                </div>

                {success ? (
                    <div style={{ padding: '16px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '6px' }}>check_circle</span>
                        Đặt mật khẩu thành công! Đang chuyển đến trang đăng nhập...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Mật khẩu mới</label>
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập lại mật khẩu mới..."
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="login-input"
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                                required
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                marginTop: '8px'
                            }}
                        >
                            {loading ? "Đang lưu mật khẩu..." : "Xác nhận & Đặt mật khẩu"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}