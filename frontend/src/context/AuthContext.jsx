import { createContext, useContext, useEffect, useRef, useState } from 'react';
import supabase from '../config/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Ref để đánh dấu getSession đã hoàn tất — tránh onAuthStateChange ghi đè sớm
    const initialCheckDone = useRef(false);

    useEffect(() => {
        // 1. getSession là nguồn duy nhất kiểm soát trạng thái loading ban đầu
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
            } else {
                // Không có session hợp lệ — xóa hết token và session Supabase nội bộ
                setUser(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
                // signOut() xóa key nội bộ Supabase (sb-*-auth-token) trong localStorage
                await supabase.auth.signOut().catch(() => {});
            }
            initialCheckDone.current = true;
            setLoading(false);
        });

        // 2. onAuthStateChange cập nhật user dựa trên các event cụ thể
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Bỏ qua sự kiện INITIAL_SESSION — đã được xử lý bởi getSession ở trên
            if (!initialCheckDone.current && event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_IN' && session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
            } else if (event === 'SIGNED_OUT' || !session) {
                setUser(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
            } else if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/login/dashboard'
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        // Luôn clear user và localStorage, dù signOut có lỗi hay không
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Supabase signOut error:", err);
        } finally {
            setUser(null);
            localStorage.removeItem("token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("access_token");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
