// import { createContext, useContext, useEffect, useState } from 'react';
// import supabase from '../config/supabaseClient';

// const AuthContext = createContext({});

// export function AuthProvider({ children }) {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         // Check active session on mount
//         supabase.auth.getSession().then(({ data: { session } }) => {
//             if (session) {
//                 setUser(session.user);
//                 localStorage.setItem("token", session.access_token);
//                 localStorage.setItem("accessToken", session.access_token);
//                 localStorage.setItem("access_token", session.access_token);
//             } else {
//                 setUser(null);
//             }
//             setLoading(false);
//         });

//         // Listen for auth state changes
//         const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
//             console.log("Supabase Auth Event:", event);
//             if (session) {
//                 setUser(session.user);
//                 localStorage.setItem("token", session.access_token);
//                 localStorage.setItem("accessToken", session.access_token);
//                 localStorage.setItem("access_token", session.access_token);
//             } else {
//                 setUser(null);
//                 localStorage.removeItem("token");
//                 localStorage.removeItem("accessToken");
//                 localStorage.removeItem("access_token");
//             }
//             setLoading(false);
//         });

//         return () => {
//             subscription.unsubscribe();
//         };
//     }, []);

//     const loginWithGoogle = async () => {
//         const { error } = await supabase.auth.signInWithOAuth({
//             provider: 'google',
//             options: {
//                 redirectTo: window.location.origin + '/login/dashboard'
//             }
//         });
//         if (error) throw error;
//     };

//     const forgotPassword = async (email) => {

//         const { error } =
//             await supabase.auth.resetPasswordForEmail(
//                 email,
//                 {
//                     redirectTo:
//                         window.location.origin +
//                         "/reset-password"
//                 }
//             );

//         if (error) throw error;
//     };

//     // THÊM MỚI
//     const updatePassword = async (
//         password
//     ) => {

//         const { error } =
//             await supabase.auth.updateUser({

//                 password

//             });

//         if (error) throw error;
//     };

//     const logout = async () => {
//         const { error } = await supabase.auth.signOut();
//         if (error) throw error;
//     };

//     // const forgotPassword = async (email) => {

//     //     const { error } =
//     //         await supabase.auth.resetPasswordForEmail(
//     //             email,
//     //             {
//     //                 redirectTo:
//     //                     window.location.origin +
//     //                     "/reset-password"
//     //             }
//     //         );

//     //     if (error) throw error;
//     // };

//     // const updatePassword = async (newPassword) => {

//     //     const { error } =
//     //         await supabase.auth.updateUser({

//     //             password: newPassword

//     //         });

//     //     if (error) throw error;
//     // };

//     return (
//         <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, forgotPassword, updatePassword }}>
//             {!loading && children}
//         </AuthContext.Provider>
//     );
// }

// export const useAuth = () => useContext(AuthContext);


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
        // 1. getSession là nguồn duy nhất kiểm soát trạng thái loading ban đầu
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else {
                // Không có session hợp lệ — xóa hết token và session Supabase nội bộ
                setUser(null);
                setUserRole(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
                localStorage.removeItem("userRole");
                // signOut() xóa key nội bộ Supabase (sb-*-auth-token) trong localStorage
                await supabase.auth.signOut().catch(() => {});
            }
            initialCheckDone.current = true;
            setLoading(false);
        });

        // 2. onAuthStateChange cập nhật user dựa trên các event cụ thể
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Supabase Auth Event:", event);

            // Bỏ qua sự kiện INITIAL_SESSION — đã được xử lý bởi getSession ở trên
            if (!initialCheckDone.current && event === 'INITIAL_SESSION') return;

            /*
             * QUAN TRỌNG
             * Khi click link reset password
             * Supabase sẽ phát event này
             */
            if (event === "PASSWORD_RECOVERY") {
                window.location.replace("/reset-password");
                return;
            }

            if (event === 'SIGNED_IN' && session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else if (event === 'SIGNED_OUT' || !session) {
                setUser(null);
                setUserRole(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
                localStorage.removeItem("userRole");
            } else if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
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
                        `${window.location.origin}/login/dashboard`

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