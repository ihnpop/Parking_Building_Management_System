import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../config/supabaseClient';

const AuthContext = createContext({});

/**
 * Lấy role_name của user hiện tại từ bảng profiles
 * @param {string} userId
 * @returns {Promise<string>} role_name: 'ADMIN' | 'MANAGER' | 'STAFF'
 */
async function fetchUserRole(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role:role_id(role_name)')
            .eq('id', userId)
            .single();
        if (error || !data) return null;
        return data.role?.role_name || null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'ADMIN' | 'MANAGER' | 'STAFF'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
                const role = await fetchUserRole(session.user.id);
                setUserRole(role);
            } else {
                setUser(null);
                setUserRole(null);
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
                const role = await fetchUserRole(session.user.id);
                setUserRole(role);
            } else {
                setUser(null);
                setUserRole(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
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
