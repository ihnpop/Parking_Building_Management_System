import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";

import supabase from "../config/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
    const [loading, setLoading] = useState(true);
    // Ref để đánh dấu getSession đã hoàn tất — tránh onAuthStateChange ghi đè sớm
    const initialCheckDone = useRef(false);

    const fetchUserProfile = async (sessionUser) => {
        if (!sessionUser) return;
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("role:role_id (role_name)")
                .eq("id", sessionUser.id)
                .single();

            if (data && data.role) {
                const roleName = data.role.role_name;
                setUserRole(roleName);
                localStorage.setItem("userRole", roleName);
            } else {
                setUserRole("STAFF");
                localStorage.setItem("userRole", "STAFF");
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
            setUserRole("STAFF");
            localStorage.setItem("userRole", "STAFF");
        }
    };

    useEffect(() => {
        // 1. Khôi phục phiên đăng nhập từ Supabase session hoặc token trong localStorage
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const storedToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else if (storedToken) {
                // Nếu có token trong localStorage, duy trì vĩnh viễn phiên người dùng
                const savedRole = localStorage.getItem("userRole") || "STAFF";
                const savedEmail = localStorage.getItem("userEmail") || "user@parkflow.com";
                const savedUserId = localStorage.getItem("userId") || "00000000-0000-0000-0000-000000000000";
                setUserRole(savedRole);
                setUser({ id: savedUserId, email: savedEmail });
            }
            initialCheckDone.current = true;
            setLoading(false);
        });

        // 2. Lắng nghe sự kiện Auth (duy trì phiên liên tục ngay cả khi Supabase tự xóa session do quá hạn)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!initialCheckDone.current && event === 'INITIAL_SESSION') return;

            if (event === "PASSWORD_RECOVERY") {
                window.location.replace("#/reset-password");
                return;
            }

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else {
                // Tuyệt đối không đăng xuất tự động khi token hết hạn hay SIGNED_OUT từ Supabase SDK
                const storedToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
                if (storedToken) {
                    const savedRole = localStorage.getItem("userRole") || "STAFF";
                    const savedEmail = localStorage.getItem("userEmail") || "user@parkflow.com";
                    const savedUserId = localStorage.getItem("userId") || "00000000-0000-0000-0000-000000000000";
                    setUserRole(savedRole);
                    setUser({ id: savedUserId, email: savedEmail });
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    /**
     * LOGIN GOOGLE
     */
    const loginWithGoogle = async () => {

        const { error } =
            await supabase.auth.signInWithOAuth({

                provider: "google",

                options: {

                    redirectTo:
                        window.location.origin

                }

            });

        if (error) throw error;
    };

    /**
     * FORGOT PASSWORD
     */
    const forgotPassword = async (email) => {

        const { error } =
            await supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        `${window.location.origin}/reset-password`
                }
            );

        if (error) throw error;
    };

    /**
     * UPDATE PASSWORD
     */
    const updatePassword = async (
        newPassword
    ) => {

        const { error } =
            await supabase.auth.updateUser({

                password: newPassword

            });

        if (error) throw error;
    };

    /**
     * LOGOUT
     */
    const logout = async () => {
        // Luôn clear user và localStorage, dù signOut có lỗi hay không
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Supabase signOut error:", err);
        } finally {
            setUser(null);
            setUserRole(null);
            localStorage.removeItem("token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("access_token");
            localStorage.removeItem("userRole");
            localStorage.removeItem("dashboard_current_view");
        }
    };

    const value = {
        user,
        userRole,
        loading,
        loginWithGoogle,
        forgotPassword,
        updatePassword,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>

    );
}

export const useAuth = () =>
    useContext(AuthContext);