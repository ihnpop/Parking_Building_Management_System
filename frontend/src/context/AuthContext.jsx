// Import các hooks React cần thiết:
// createContext: tạo Context để chia sẻ state xuyên suốt cây component mà không cần prop drilling
// useContext: đọc giá trị từ Context đã tạo
// useEffect: chạy side-effect (subscribe Supabase, cleanup) sau khi component render
// useRef: giữ một giá trị mutable không gây re-render (dùng để đánh dấu getSession đã chạy xong)
// useState: quản lý state của component (user, userRole, loading)
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";

// Import client Supabase để gọi Auth API (getSession, onAuthStateChange, signOut, v.v.)
import supabase from "../config/supabaseClient";

// Tạo AuthContext — là "kênh" chia sẻ thông tin đăng nhập (user, role, các hàm auth) cho toàn app
const AuthContext = createContext();

// AuthProvider: component bọc toàn bộ app, cung cấp AuthContext cho mọi component con
export function AuthProvider({ children }) {

    // State lưu thông tin user hiện tại (object Supabase user hoặc null nếu chưa đăng nhập)
    const [user, setUser] = useState(null);
    // State lưu role người dùng (ADMIN/MANAGER/STAFF), khởi tạo từ localStorage để duy trì qua reload
    const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
    // State loading: true khi chưa xác định được phiên đăng nhập (hiển thị màn hình trắng hoặc spinner)
    const [loading, setLoading] = useState(true);
    // Ref để đánh dấu getSession đã hoàn tất — tránh onAuthStateChange ghi đè sớm
    const initialCheckDone = useRef(false);

    // Hàm lấy role của user từ bảng "profiles" trong Supabase (join với bảng roles)
    const fetchUserProfile = async (sessionUser) => {
        // Không xử lý nếu không có thông tin user
        if (!sessionUser) return;
        try {
            // Query bảng "profiles", lấy role_name thông qua foreign key role_id
            const { data, error } = await supabase
                .from("profiles")
                .select("role:role_id (role_name)")
                .eq("id", sessionUser.id) // Lọc theo id của user hiện tại
                .single(); // Chỉ lấy 1 bản ghi

            if (data && data.role) {
                // Lưu role vào state và localStorage để dùng lại khi reload trang
                const roleName = data.role.role_name;
                setUserRole(roleName);
                localStorage.setItem("userRole", roleName);
            } else {
                // Nếu không tìm thấy role thì mặc định là STAFF (ít quyền nhất)
                setUserRole("STAFF");
                localStorage.setItem("userRole", "STAFF");
            }
        } catch (err) {
            // Ghi lỗi và fallback về STAFF nếu không lấy được profile
            console.error("Error fetching user profile:", err);
            setUserRole("STAFF");
            localStorage.setItem("userRole", "STAFF");
        }
    };

    // useEffect chạy 1 lần khi component mount để thiết lập auth state
    useEffect(() => {
        // 1. Khôi phục phiên đăng nhập từ Supabase session hoặc token trong localStorage
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            // Đọc token từ localStorage (có thể được lưu bởi nhiều key khác nhau)
            const storedToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (session) {
                // Có session hợp lệ từ Supabase: cập nhật user state và lưu token vào localStorage
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                // Lấy role từ Supabase database
                await fetchUserProfile(session.user);
            } else if (storedToken) {
                // Nếu có token trong localStorage, duy trì vĩnh viễn phiên người dùng
                // (tránh logout tự động khi Supabase session hết hạn)
                const savedRole = localStorage.getItem("userRole") || "STAFF";
                const savedEmail = localStorage.getItem("userEmail") || null;
                const savedUserId = localStorage.getItem("userId") || null;
                setUserRole(savedRole);
                // Tái tạo user object tối thiểu từ dữ liệu đã lưu trong localStorage
                setUser({ id: savedUserId, email: savedEmail });
            }
            // Đánh dấu kiểm tra ban đầu đã hoàn tất
            initialCheckDone.current = true;
            // Tắt loading để render UI
            setLoading(false);
        });

        // 2. Lắng nghe sự kiện Auth (duy trì phiên liên tục ngay cả khi Supabase tự xóa session do quá hạn)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Bỏ qua sự kiện INITIAL_SESSION nếu getSession() chưa chạy xong để tránh race condition
            if (!initialCheckDone.current && event === 'INITIAL_SESSION') return;

            // Khi Supabase phát hiện luồng reset mật khẩu, redirect về trang reset-password
            if (event === "PASSWORD_RECOVERY") {
                window.location.replace("#/reset-password");
                return;
            }

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
                // Khi đăng nhập thành công hoặc token được gia hạn: cập nhật user và lưu token mới
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else {
                // Tuyệt đối không đăng xuất tự động khi token hết hạn hay SIGNED_OUT từ Supabase SDK
                // Kiểm tra localStorage: nếu còn token thì giữ phiên
                const storedToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
                if (storedToken) {
                    const savedRole = localStorage.getItem("userRole") || "STAFF";
                    const savedEmail = localStorage.getItem("userEmail") || null;
                    const savedUserId = localStorage.getItem("userId") || null;
                    setUserRole(savedRole);
                    setUser({ id: savedUserId, email: savedEmail });
                }
            }
        });

        // Cleanup: hủy đăng ký lắng nghe Auth event khi component unmount để tránh memory leak
        return () => {
            subscription.unsubscribe();
        };
    }, []); // [] — chỉ chạy 1 lần khi mount

    /**
     * LOGIN GOOGLE
     * Kích hoạt luồng OAuth với provider Google, redirect người dùng tới trang đồng ý của Google
     */
    const loginWithGoogle = async () => {

        const { error } =
            await supabase.auth.signInWithOAuth({

                provider: "google",

                options: {

                    redirectTo:
                        // Sau khi Google OAuth hoàn tất, redirect về origin của trang hiện tại
                        window.location.origin

                }

            });

        // Ném lỗi ra ngoài để caller (LoginPage) có thể xử lý và hiển thị thông báo
        if (error) throw error;
    };

    /**
     * FORGOT PASSWORD
     * Gửi email chứa link reset mật khẩu cho người dùng
     */
    const forgotPassword = async (email) => {

        const { error } =
            await supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        // Link reset sẽ redirect về trang /reset-password sau khi user click
                        `${window.location.origin}/reset-password`
                }
            );

        if (error) throw error;
    };

    /**
     * UPDATE PASSWORD
     * Cập nhật mật khẩu mới cho user đang đăng nhập (dùng sau khi nhấn link reset)
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
     * Đăng xuất: xóa session Supabase và xóa toàn bộ dữ liệu auth trong localStorage
     */
    const logout = async () => {
        // Luôn clear user và localStorage, dù signOut có lỗi hay không
        try {
            // Gọi Supabase signOut để vô hiệu hóa token phía server
            await supabase.auth.signOut();
        } catch (err) {
            // Ghi log nhưng vẫn tiếp tục clear local data
            console.error("Supabase signOut error:", err);
        } finally {
            // Reset state về null
            setUser(null);
            setUserRole(null);
            // Xóa tất cả key token khỏi localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("access_token");
            localStorage.removeItem("userRole");
            // Xóa tab đang active trong dashboard để tránh vào nhầm tab khi đăng nhập lại
            localStorage.removeItem("dashboard_current_view");
        }
    };

    // Object giá trị được cung cấp cho toàn bộ cây component thông qua AuthContext
    const value = {
        user,          // Thông tin user hiện tại (id, email, ...)
        userRole,      // Role hiện tại (ADMIN/MANAGER/STAFF)
        loading,       // Trạng thái đang kiểm tra phiên đăng nhập
        loginWithGoogle,  // Hàm đăng nhập bằng Google OAuth
        forgotPassword,   // Hàm gửi email reset mật khẩu
        updatePassword,   // Hàm đổi mật khẩu mới
        logout            // Hàm đăng xuất
    };

    return (
        // AuthContext.Provider: bọc children và truyền value xuống toàn bộ cây component con
        <AuthContext.Provider value={value}>
            {/* Chỉ render children khi đã xác định xong phiên đăng nhập (loading = false) */}
            {!loading && children}
        </AuthContext.Provider>

    );
}

// Custom hook để đọc AuthContext — dùng trong bất kỳ component nào cần thông tin auth
export const useAuth = () =>
    useContext(AuthContext);