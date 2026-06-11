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
    useState
} from "react";

import supabase from "../config/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const getCurrentSession = async () => {

            const {
                data: { session }
            } = await supabase.auth.getSession();

            if (session) {

                setUser(session.user);

                localStorage.setItem(
                    "token",
                    session.access_token
                );

            } else {

                setUser(null);

                localStorage.removeItem(
                    "token"
                );
            }

            setLoading(false);
        };

        getCurrentSession();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                console.log(
                    "Supabase Auth Event:",
                    event
                );

                /*
                 * QUAN TRỌNG
                 * Khi click link reset password
                 * Supabase sẽ phát event này
                 */
                if (
                    event === "PASSWORD_RECOVERY"
                ) {

                    window.location.replace(
                        "/reset-password"
                    );

                    return;
                }

                if (session) {

                    setUser(session.user);

                    localStorage.setItem(
                        "token",
                        session.access_token
                    );

                } else {

                    setUser(null);

                    localStorage.removeItem(
                        "token"
                    );
                }

                setLoading(false);
            }
        );

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

        const { error } =
            await supabase.auth.signOut();

        if (error) throw error;

        localStorage.removeItem(
            "token"
        );

        setUser(null);
    };

    const value = {

        user,

        loading,

        loginWithGoogle,

        forgotPassword,

        updatePassword,

        logout

    };

    return (

        <AuthContext.Provider value={value}>

            {
                !loading &&
                children
            }

        </AuthContext.Provider>

    );
}

export const useAuth = () =>
    useContext(AuthContext);