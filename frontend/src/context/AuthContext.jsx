import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../config/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(() => localStorage.getItem("userRole") || null);
    const [loading, setLoading] = useState(true);

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
        // Check active session on mount
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else {
                setUser(null);
                setUserRole(null);
                localStorage.removeItem("userRole");
            }
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Supabase Auth Event:", event);
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                await fetchUserProfile(session.user);
            } else {
                setUser(null);
                setUserRole(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
                localStorage.removeItem("userRole");
            }
            setLoading(false);
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
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, userRole, loading, loginWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
